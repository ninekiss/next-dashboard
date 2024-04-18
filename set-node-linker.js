const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

// 需要引入的包的名称
const gradientString = 'gradient-string';

// 检查 node_modules 目录中是否存在这个包
if (!fs.existsSync(path.join(__dirname, 'node_modules', gradientString))) {
    console.log('pre-installing...')
    // 如果不存在，就安装这个包
    execSync(`pnpm install ${gradientString} -O --silent --ignore-scripts`, { stdio: 'inherit' });
}

// 引入这个包
const gradient = require(gradientString);
const color = gradient('cyan', 'gold')

// 获取操作系统类型
const osType = os.type();

if (osType !== 'Windows_NT') {
    console.log(color('Set-node-linker: Everything is ready'))
    process.exit()
} 





// 根据操作系统类型设置 node-linker 的值
const nodeLinkerValue = osType === 'Windows_NT' ? 'hoisted' : 'isolated';

// 构建 .npmrc 文件的内容
const npmrcContent = `node-linker = ${nodeLinkerValue}\n`;

const npmrcPath = path.join(process.cwd(), '.npmrc');

// 检查 .npmrc 文件是否存在
if (!fs.existsSync(npmrcPath)) {
    fs.writeFileSync(npmrcPath, npmrcContent);
} else {
    const existingContent = fs.readFileSync(npmrcPath, 'utf8');

    // 检查 node-linker 的设置是否已经存在
    if (!existingContent.includes('node-linker')) {
        fs.appendFileSync(npmrcPath, npmrcContent);
    } else {
        const newContent = existingContent.replace(/node-linker = .*\n/, npmrcContent);
        fs.writeFileSync(npmrcPath, newContent);
    }
}

console.log(color(`Set-node-linker: Update node-linker to \`${nodeLinkerValue}\`\n`))