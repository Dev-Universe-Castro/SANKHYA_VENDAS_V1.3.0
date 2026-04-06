const fs = require('fs');
const path = require('path');

const extensions = ['.tsx', '.ts', '.js'];
const searchDirs = ['app', 'components'];

function processDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            processDir(fullPath);
        } else if (stat.isFile() && extensions.includes(path.extname(fullPath))) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let newContent = content;

            // Remove hideFloatingMenu={true}
            newContent = newContent.replace(/\s+hideFloatingMenu=\{true\}/g, '');
            // Remove hideFloatingMenu
            newContent = newContent.replace(/\s+hideFloatingMenu/g, '');

            if (content !== newContent) {
                fs.writeFileSync(fullPath, newContent, 'utf8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    }
}

searchDirs.forEach(dir => processDir(path.join(__dirname, dir)));
console.log("Done");
