import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const certPath = path.join(__dirname, 'dummy.pfx');
if (!fs.existsSync(certPath)) {
  fs.writeFileSync(certPath, Buffer.from('dummy-cert'));
}

export default certPath;
