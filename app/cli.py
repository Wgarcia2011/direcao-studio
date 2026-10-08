"""Cliente local para agentes: mesma API e validações da interface."""
import argparse
import http.client
import json
from pathlib import Path
import re
import sys
import time
import urllib.error
import urllib.request


class Client:
    def __init__(self, port=8765):
        if not 1 <= port <= 65535:
            raise ValueError('Porta inválida.')
        self.port = port
        self.base = f'http://127.0.0.1:{port}'
        self.token = None

    def request(self, path, data=None):
        if data is not None and self.token is None:
            with urllib.request.urlopen(self.base + '/editor', timeout=30) as response:
                page = response.read().decode('utf-8')
            match = re.search(r'name="editor-token" content="([^"]+)"', page)
            if not match:
                raise ValueError('Token de sessão não encontrado.')
            self.token = match.group(1)
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['X-Editor-Token'] = self.token
        body = json.dumps(data).encode('utf-8') if data is not None else None
        request = urllib.request.Request(self.base + path, data=body, headers=headers)
        with urllib.request.urlopen(request, timeout=120) as response:
            return json.load(response)

    def upload(self, path, project=None):
        path = Path(path).resolve(strict=True)
        limit=60*1024**2 if project else 2*1024**3
        if not 0 < path.stat().st_size <= limit:
            raise ValueError('Use mídia de até 60 MB.' if project else 'Use um vídeo de até 2 GB.')
        # Obtain the session token, then stream instead of holding the video in RAM.
        if self.token is None:
            with urllib.request.urlopen(self.base + '/editor', timeout=30) as response:
                match = re.search(r'name="editor-token" content="([^"]+)"', response.read().decode('utf-8'))
            if not match:
                raise ValueError('Token de sessão não encontrado.')
            self.token = match.group(1)
        from urllib.parse import quote
        connection = http.client.HTTPConnection('127.0.0.1', self.port, timeout=300)
        try:
            connection.putrequest('POST', '/api/motion/upload?project='+quote(project) if project else '/api/upload')
            connection.putheader('X-Editor-Token', self.token)
            connection.putheader('X-File-Name', quote(path.name))
            connection.putheader('Content-Type', 'application/octet-stream')
            connection.putheader('Content-Length', str(path.stat().st_size))
            connection.endheaders()
            with path.open('rb') as stream:
                while block := stream.read(1024 * 1024):
                    connection.send(block)
            response = connection.getresponse()
            result = json.loads(response.read())
            if response.status >= 400:
                raise ValueError(result.get('message', 'Falha na importação.'))
            return result
        finally:
            connection.close()


def load(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))


def wait_job(client, result, timeout):
    deadline=time.monotonic()+timeout;last=None
    while result['state'] in ('waiting','running'):
        if time.monotonic()>=deadline:
            raise ValueError('Tempo de espera esgotado; consulte job '+result['id'])
        if result.get('message')!=last:
            last=result.get('message');print(last,file=sys.stderr)
        time.sleep(1)
        result=client.request('/api/jobs/'+result['id'])
    if result['state']!='done':raise ValueError(result.get('message','Falha no processamento.'))
    return result


def main():
    # JSON is UTF-8 even when PowerShell redirects output on Windows.
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, 'reconfigure'):
            stream.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8765)
    commands = parser.add_subparsers(dest='command', required=True)
    commands.add_parser('health')
    commands.add_parser('projects')
    commands.add_parser('motion-presets')
    motion_show=commands.add_parser('motion-show');motion_show.add_argument('project')
    motion_upload=commands.add_parser('motion-upload');motion_upload.add_argument('project');motion_upload.add_argument('file')
    motion_preset=commands.add_parser('motion-preset');motion_preset.add_argument('project');motion_preset.add_argument('file')
    motion_render=commands.add_parser('motion-render');motion_render.add_argument('project')
    motion_render.add_argument('--full',action='store_true');motion_render.add_argument('--start',type=float,default=0)
    motion_render.add_argument('--seconds',type=float,default=15);motion_render.add_argument('--wait',action='store_true')
    motion_render.add_argument('--timeout',type=int,default=7200)
    motion_approve=commands.add_parser('motion-approve');motion_approve.add_argument('project')
    motion_approve.add_argument('--reviewed',action='store_true',required=True)
    upload = commands.add_parser('import')
    upload.add_argument('file')
    show = commands.add_parser('show')
    show.add_argument('project')
    job = commands.add_parser('job')
    job.add_argument('id')
    run = commands.add_parser('run')
    run.add_argument('project')
    run.add_argument('action', choices=['cortar', 'legendar', 'preparar', 'amostra', 'exportar', 'editar', 'montar', 'preview-remotion', 'limpar', 'automatico'])
    run.add_argument('--settings', help='JSON de configurações; padrão: configuração atual.')
    run.add_argument('--automatic', help='JSON das etapas automáticas.')
    run.add_argument('--wait', action='store_true')
    run.add_argument('--timeout', type=int, default=7200)
    for name in ('actions', 'settings', 'captions', 'motion'):
        command = commands.add_parser(name)
        command.add_argument('project')
        command.add_argument('file', help='Arquivo JSON; ações: {revision, actions}.')
    history = commands.add_parser('history')
    history.add_argument('project')
    history.add_argument('revision', type=int)
    history.add_argument('direction', choices=['undo', 'redo'])
    approve = commands.add_parser('approve')
    approve.add_argument('project')
    approve.add_argument('--reviewed', action='store_true', required=True,
                         help='Use somente após aprovação explícita do usuário.')
    args = parser.parse_args()
    client = Client(args.port)
    try:
        if args.command == 'motion-presets':
            result=client.request('/api/motion/presets')
        elif args.command == 'motion-show':
            result=client.request('/api/motion?project='+args.project)
        elif args.command == 'motion-upload':
            result=client.upload(args.file,args.project)
        elif args.command == 'motion-preset':
            data=load(args.file)
            if not isinstance(data,dict):raise ValueError('O arquivo deve conter um objeto JSON.')
            data['project']=args.project;result=client.request('/api/motion/preset',data)
        elif args.command == 'motion-approve':
            result=client.request('/api/motion/approve',{'project':args.project,'reviewed':True})
        elif args.command == 'motion-render':
            result=client.request('/api/motion/render',{'project':args.project,'sample':not args.full,'start':args.start,'seconds':args.seconds})
            if args.wait:result=wait_job(client,result,args.timeout)
        elif args.command == 'health':
            result = client.request('/api/health')
        elif args.command in ('projects', 'show'):
            result = client.request('/api/projects')
            if args.command == 'show':
                result = next((p for p in result if p['id'] == args.project), None)
                if result is None:
                    raise ValueError('Projeto não encontrado.')
        elif args.command == 'import':
            result = client.upload(args.file)
        elif args.command == 'job':
            result = client.request('/api/jobs/' + args.id)
            if result.get('state') in {'error','failed'}:
                raise ValueError(result.get('message', 'Falha no processamento.'))
        elif args.command in ('run', 'approve'):
            current = next((p for p in client.request('/api/projects') if p['id'] == args.project), None)
            if current is None:
                raise ValueError('Projeto não encontrado.')
            settings = load(args.settings) if getattr(args, 'settings', None) else current['settings']
            if args.command == 'approve':
                result = client.request('/api/approve', {'project': args.project, 'settings': settings})
            else:
                data = {'project': args.project, 'action': args.action, 'settings': settings}
                if args.automatic:
                    data['automatic'] = load(args.automatic)
                result = client.request('/api/jobs', data)
                if args.wait:
                    result=wait_job(client,result,args.timeout)
        elif args.command == 'history':
            result = client.request('/api/history', {'project': args.project, 'revision': args.revision, 'history': args.direction})
        else:
            payload = load(args.file)
            if args.command == 'settings':
                payload = {'settings': payload}
            if not isinstance(payload, dict):
                raise ValueError('O arquivo deve conter um objeto JSON.')
            payload['project'] = args.project
            result = client.request('/api/' + args.command, payload)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    except urllib.error.HTTPError as error:
        try:
            message = json.load(error).get('message', str(error))
        except (ValueError, AttributeError):
            message = str(error)
    except (OSError, ValueError, KeyError, StopIteration, http.client.HTTPException) as error:
        message = str(error)
    print(json.dumps({'error': message}, ensure_ascii=False), file=sys.stderr)
    return 1


if __name__ == '__main__':
    sys.exit(main())
