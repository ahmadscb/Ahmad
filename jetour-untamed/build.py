"""Builds index.html from src.html: inlines three.js and the T2 film frames so the page works offline as one file."""
import base64, glob, json, pathlib
here = pathlib.Path(__file__).parent
src = (here / 'src.html').read_text()
three = (here / 'vendor/three.min.js').read_text()
frames = ['data:image/jpeg;base64,' + base64.b64encode(p.read_bytes()).decode() for p in sorted(here.glob('frames/*.jpg'))]
assert '%%THREE%%' in src and '%%FRAMES%%' in src and len(frames) == 120
(here / 'index.html').write_text(src.replace('%%THREE%%', three.replace('</script', '<\\/script')).replace('%%FRAMES%%', json.dumps(frames)))
print('index.html', round((here / 'index.html').stat().st_size / 1e6, 2), 'MB')
