const fs = require('fs');
const path = require('path');

const extensions = ['.tsx', '.ts', '.js'];
const searchDirs = ['components', 'app'];

function processDir(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            processDir(fullPath);
        } else if (stat.isFile() && extensions.includes(path.extname(fullPath))) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let newContent = content;

            // Fix "Predict Sales" -> "PredictSales"
            newContent = newContent.replace(/\bPredict\s+Sales\b/g, 'PredictSales');

            // Fix "Predict" -> "PredictSales"
            newContent = newContent.replace(/\bPredict\b(?!\s*(Chat|Sales))/gi, (match) => {
                if (match === 'PREDICT' || match === 'predict') return match; // skip all caps or all lower just in case, though user said "Predict"
                if (match === 'Predict') return 'PredictSales';
                return match;
            });

            if (content !== newContent) {
                fs.writeFileSync(fullPath, newContent, 'utf8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    }
}

searchDirs.forEach(dir => processDir(path.join(__dirname, dir)));
console.log("Done");
