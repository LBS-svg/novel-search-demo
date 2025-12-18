// 配置项（★★★请替换为你自己的通义千问API密钥★★★）
const API_KEY = "sk-dc6ccba625b8476ab9429ec07d1c5c76"; // 格式：sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// 通义千问官方API地址
const QWEN_API_URL = "https://dashscope.aliyuncs.com/api/v1/chat/completions";
// 使用Moesif CORS公共代理（稳定，无需申请权限）
const PROXY_URL = "https://cors.moesif.com/rewrite/" + QWEN_API_URL;

// 页面加载完成后执行代码
document.addEventListener("DOMContentLoaded", function() {
    // 校验API密钥是否配置
    if (!API_KEY || API_KEY === "你的通义千问API密钥") {
        alert("请先替换script.js中的API_KEY为你自己的通义千问密钥！");
        return; // 未配置密钥，停止执行
    }

    // 获取页面元素
    const novelNameInput = document.getElementById("novelNameInput");
    const searchBtn = document.getElementById("searchBtn");
    const loading = document.getElementById("loading");
    const result = document.getElementById("result");

    // 绑定搜索按钮点击事件
    searchBtn.addEventListener("click", async function() {
        const novelName = novelNameInput.value.trim();
        // 校验输入：不能为空
        if (!novelName) {
            alert("请输入小说名称！");
            novelNameInput.focus(); // 光标定位到输入框，提升体验
            return;
        }

        // 初始化界面状态
        result.innerHTML = "";
        loading.style.display = "block"; // 显示加载中

        try {
            // 调用AI获取小说剧情
            const plotInfo = await getNovelPlot(novelName);
            // 隐藏加载，展示结果（将换行符转为<br>，适配网页显示）
            loading.style.display = "none";
            result.innerHTML = plotInfo.replace(/\n/g, "<br>");
        } catch (error) {
            // 异常处理：隐藏加载，显示错误信息
            loading.style.display = "none";
            result.innerHTML = `<span style="color: #e74c3c;">搜索失败：${error.message}</span>`;
            console.error("AI调用错误详情：", error); // 控制台输出详情，便于排查
        }
    });

    // 核心函数：使用Moesif代理调用qwen3-max模型，联网搜索小说剧情
    async function getNovelPlot(novelName) {
        // 构造提示词（明确要求联网+固定结构，避免AI编造内容）
        const prompt = `请你使用联网功能搜索小说《${novelName}》的最新、最准确的信息，严格按照以下结构返回结果，不要遗漏任何部分：
1. 故事简介：简要介绍小说的核心内容、故事背景和主要主题（控制在100字左右）；
2. 剧情梳理：按照时间顺序梳理小说的主要剧情节点，分点说明（至少5个关键节点）；
注意：如果搜索不到该小说的相关信息，请直接告知用户“未搜索到《${novelName}》的相关信息，可能是小说名错误或该小说暂未被收录”，绝对不要编造任何内容。`;

        // 构造请求参数（适配通义千问API）
        const requestData = {
            model: "qwen3-max", // 指定使用qwen3-max模型（支持联网）
            messages: [
                {
                    role: "user", // 角色为用户
                    content: prompt // 传递提示词
                }
            ],
            temperature: 0.5, // 随机性：0.5更稳定，适合剧情梳理
            max_tokens: 2048, // 最大返回字符数，足够容纳内容
            stream: false // 关闭流式返回，直接获取完整结果
        };

        // 发送请求到Moesif代理，再转发到通义千问API
        const response = await fetch(PROXY_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}` // 携带API密钥
            },
            body: JSON.stringify(requestData)
        });

        // 处理响应错误
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API请求失败（${response.status}）：${errorData.error?.message || "未知错误"}`);
        }

        // 解析响应数据
        const data = await response.json();
        // 校验返回内容是否有效
        const choices = data.output?.choices || data.choices; // 兼容通义千问API的不同返回格式
        if (!choices || choices.length === 0) {
            throw new Error("AI未返回任何有效内容");
        }
        const content = choices[0]?.message?.content?.trim();
        if (!content) {
            throw new Error("AI返回的内容为空");
        }

        return content;
    }
});