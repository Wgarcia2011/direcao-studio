"""Cliente local JSON-RPC do unico editor. Nunca imprime o token de autenticacao."""
import argparse
import ipaddress
import json
from pathlib import Path
import socket
import sys

ROOT = Path(__file__).resolve().parents[1]


class RpcError(RuntimeError):
    pass


def settings_path(root=ROOT):
    config = root / 'config.local.json'
    exe = root / 'vendor/concat/PFiles64/Concat/concat.exe'
    if config.is_file():
        exe = Path(json.loads(config.read_text(encoding='utf-8-sig'))['executable'])
    portable = exe.parent / 'portable/settings.json'
    if portable.is_file():
        return portable
    raise RpcError('Preferencias nao encontradas. Abra o Concat e habilite a API local; use --settings se necessario.')


def endpoint(settings):
    server = settings['server']
    # Uma segunda janela pode salvar enabled=false enquanto a primeira continua
    # servindo. A conexao autenticada, nao essa preferencia, confirma disponibilidade.
    if not server.get('token'):
        raise RpcError('Gere um token nas configuracoes da API local do Concat.')
    host, port = server['listen'].rsplit(':', 1)
    host = host.strip('[]')
    if host == 'localhost':
        host = '127.0.0.1'
    if not ipaddress.ip_address(host).is_loopback:
        raise RpcError('A integracao aceita somente enderecos de loopback.')
    return host, int(port), server['token']


def invoke(settings, method, params, timeout=30, wait=False):
    host, port, token = endpoint(settings)
    events = []
    with socket.create_connection((host, port), timeout=timeout) as connection:
        connection.settimeout(timeout)
        with connection.makefile('rwb') as stream:
            def receive():
                line = stream.readline(16 * 1024 * 1024 + 1)
                if not line:
                    raise RpcError('Conexao encerrada. Confira o estado antes de repetir uma alteracao.')
                if len(line) > 16 * 1024 * 1024:
                    raise RpcError('Resposta excedeu o limite do cliente.')
                return json.loads(line)

            def request(identifier, name, arguments):
                stream.write((json.dumps({'jsonrpc': '2.0', 'id': identifier,
                                         'method': name, 'params': arguments}) + '\n').encode())
                stream.flush()
                while True:
                    response = receive()
                    if response.get('id') != identifier:
                        events.append(response)
                        continue
                    if 'error' in response:
                        # Auth errors may include data; never echo a server-supplied token.
                        if name == 'auth':
                            raise RpcError('Autenticacao recusada. Verifique o token local.')
                        raise RpcError(json.dumps(response['error'], ensure_ascii=False).replace(token, '[redacted]'))
                    return response

            request(0, 'auth', {'token': token})
            response = request(1, method, params)
            if wait and method == 'export.run':
                job = response['result']['job']
                while True:
                    event = events.pop(0) if events else receive()
                    if event.get('params', {}).get('job') != job:
                        continue
                    if event.get('method') == 'export.failed':
                        raise RpcError('Exportacao falhou: ' + json.dumps(event).replace(token, '[redacted]'))
                    if event.get('method') == 'export.done':
                        return event
            return response


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('method', nargs='?', default='version')
    parser.add_argument('--params', type=Path, help='Arquivo JSON UTF-8 com os parametros')
    parser.add_argument('--settings', type=Path, help='Preferencias locais do Concat; nunca versionar')
    parser.add_argument('--timeout', type=float, default=30)
    parser.add_argument('--wait', action='store_true', help='Aguardar export.done; timeout nao cancela o job')
    parser.add_argument('--sample', action='store_true', help='Exportacao destinada a revisao; use uma timeline curta')
    parser.add_argument('--reviewed', action='store_true', help='Operador confirma aprovacao humana da amostra atual')
    args = parser.parse_args(argv)
    if args.method == 'auth':
        parser.error('Autenticacao e automatica.')
    if args.method == 'export.run' and not (args.sample or args.reviewed):
        parser.error('Exporte uma amostra com --sample ou confirme aprovacao humana com --reviewed.')
    if args.timeout <= 0:
        parser.error('--timeout precisa ser positivo.')
    try:
        params = json.loads(args.params.read_text(encoding='utf-8-sig')) if args.params else {}
        if not isinstance(params, dict):
            raise RpcError('Parametros precisam ser um objeto JSON.')
        path = args.settings or settings_path()
        settings = json.loads(path.read_text(encoding='utf-8-sig'))
        response = invoke(settings, args.method, params, args.timeout, args.wait)
        print(json.dumps(response, ensure_ascii=False))
        return 0
    except (OSError, ValueError, KeyError, RpcError):
        # Paths and raw exceptions can include private settings. Do not dump them.
        print(json.dumps({'error': 'Falha na chamada local. Confira Concat, preferencias e parametros. '
                         'Timeout nao cancela operacoes; verifique o estado antes de repetir.'}), file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
