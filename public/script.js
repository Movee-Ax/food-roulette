// public/script.js

// ... (省略前半部分代码，保持不变)

// 初始化转盘数据
document.addEventListener('DOMContentLoaded', () => {
    fetchItems();
    editorForm.addEventListener('submit', handleUpdate);
    spinButton.addEventListener('click', spinRoulette);
    document.getElementById('addItemButton').addEventListener('click', addItemField);
});

// --- 核心函数：获取数据并绘制 ---

function drawRoulette() {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let startAngle = 0;

    // Canvas 尺寸应通过 attributes 获取，而不是 CSS 属性
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    // 边距调整，确保文字不会超出边框
    const radius = Math.min(centerX, centerY) - 5;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    items.forEach((item, index) => {
        const angle = (item.weight / totalWeight) * 2 * Math.PI;
        const endAngle = startAngle + angle;

        // 绘制扇区
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.lineTo(centerX, centerY);
        ctx.closePath();

        // 设置颜色
        ctx.fillStyle = colorPalette[index % colorPalette.length];
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 绘制文字
        const textAngle = startAngle + angle / 2;
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(textAngle);
        ctx.textAlign = 'right';
        ctx.fillStyle = 'black';
        ctx.font = '14px Arial';
        // 确保文字不会太靠近圆心，使用 radius - 20 的位置
        ctx.fillText(item.food, radius - 20, 0);
        ctx.restore();

        startAngle = endAngle;
    });
}

// --- 核心函数：旋转逻辑 (保持与上一个版本一致) ---
async function spinRoulette() {
    // ... (保持与上一个回复中修正的 spinRoulette 函数一致)
}

// ... (省略底部辅助函数，保持不变)