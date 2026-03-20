const fs = require('fs');
const path = require('path');

const replacements = [
  { old: "'@/utils/documentPrinter'", new: "'@/domains/documents/documentPrinter'" },
  { old: '"@/utils/documentPrinter"', new: '"@/domains/documents/documentPrinter"' },
  { old: "'@/lib/calculations'", new: "'@/domains/shipments/calculations'" },
  { old: '"@/lib/calculations"', new: '"@/domains/shipments/calculations"' },
  { old: "'@/lib/schemas'", new: "'@/domains/core/schemas'" },
  { old: '"@/lib/schemas"', new: '"@/domains/core/schemas"' },
  { old: "'@/lib/subscriptionTiers'", new: "'@/domains/core/subscriptionTiers'" },
  { old: '"@/lib/subscriptionTiers"', new: '"@/domains/core/subscriptionTiers"' },
  { old: "'@/lib/customerOrderHistory'", new: "'@/domains/customers/customerOrderHistory'" },
  { old: '"@/lib/customerOrderHistory"', new: '"@/domains/customers/customerOrderHistory"' },
];

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function (file) {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (
        file.endsWith('.jsx') ||
        file.endsWith('.js') ||
        file.endsWith('.ts') ||
        file.endsWith('.tsx')
      ) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(path.join(__dirname, '../src'));
let updatedCount = 0;

files.forEach((file) => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  replacements.forEach((r) => {
    // use regex with global flag to replace all occurrences
    const regex = new RegExp(r.old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    content = content.replace(regex, r.new);
  });

  if (content !== original) {
    fs.writeFileSync(file, content);
    updatedCount++;
    console.log(`Updated ${file}`);
  }
});

console.log(`Finished updating ${updatedCount} files.`);
