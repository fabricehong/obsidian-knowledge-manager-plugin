import fs from 'fs';
import path from 'path';

// Copy templates to the plugin directory
const templateFiles = fs.readdirSync('templates');
for (const file of templateFiles) {
    if (file.endsWith('.md')) {
        fs.copyFileSync(
            path.join('templates', file),
            path.join('.', file)  // Copy directly to plugin root
        );
    }
}
