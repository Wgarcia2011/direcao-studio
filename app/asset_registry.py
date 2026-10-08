"""Imagens locais: identificadores opacos e originais preservados."""
from pathlib import Path
import hashlib,io,json,os,tempfile
APP=Path(__file__).resolve().parent
def assets():
    rows=json.loads((APP/'public/course/catalog.json').read_text(encoding='utf-8'))['assets']
    registry=APP/'public/local-assets/manifest.json'
    return rows+(json.loads(registry.read_text(encoding='utf-8')) if registry.exists() else [])
def resolve_asset(identifier):
    row=next((a for a in assets() if a['id']==identifier),None)
    if row is None:raise ValueError('Imagem não disponível na biblioteca.')
    return row
def import_image(data,name):
    from PIL import Image
    if not 0<len(data)<=20*1024*1024:raise ValueError('Use uma imagem de até 20 MB.')
    with Image.open(io.BytesIO(data)) as image:
        if image.width*image.height>20000000:raise ValueError('Use uma imagem com até 20 megapixels.')
        if image.format not in {'PNG','JPEG','WEBP'}:raise ValueError('Use PNG, JPEG ou WebP.')
        image.load();rgba=image.convert('RGBA')
    identifier='local-'+hashlib.sha256(data).hexdigest()[:24]
    folder=APP/'public/local-assets';folder.mkdir(exist_ok=True)
    original=APP.parent/'assets/originais';original.mkdir(parents=True,exist_ok=True)
    source=original/(identifier+'.bin')
    if not source.exists():source.write_bytes(data)
    rgba.save(folder/(identifier+'.png'))
    registry=folder/'manifest.json';rows=json.loads(registry.read_text(encoding='utf-8')) if registry.exists() else []
    if not any(a['id']==identifier for a in rows):
        rows.append({'id':identifier,'title':str(name)[:100] or 'Imagem importada','url':'local-assets/'+identifier+'.png'})
        with tempfile.NamedTemporaryFile(mode='w',encoding='utf-8',dir=folder,delete=False) as f:json.dump(rows,f,ensure_ascii=False);temp=f.name
        os.replace(temp,registry)
    return resolve_asset(identifier)
