const { Wallet } = require("ethers");

// 从命令行参数获取私钥
const privateKey = process.argv[2];

// 验证参数是否存在
if (!privateKey) {
    console.error("请提供私钥作为参数，例如：");
    console.error("node getAddress.js f8f8a2f43c8376ccb0871305060d7b27b0554d2cc72bccf41b2705608452f315");
    process.exit(1);
}

try {
    // 验证私钥并创建钱包实例
    const wallet = new Wallet(privateKey);
    
    // 输出结果
    console.log("私钥:", privateKey);
    console.log("地址:", wallet.address);
} catch (error) {
    console.error("无效的私钥格式！请确保私钥是64位十六进制字符串（可带或不带0x前缀）");
    console.error("错误信息:", error.message);
    process.exit(1);
}

