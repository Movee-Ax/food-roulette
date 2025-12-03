// public/script.js

const canvas = document.getElementById('rouletteCanvas');
const ctx = canvas.getContext('2d');
const spinButton = document.getElementById('spinButton');
const resultDisplay = document.getElementById('result');
const itemsContainer = document.getElementById('itemsContainer');
const editorForm = document.getElementById('editorForm');
const addItemButton = document.getElementById('addItemButton');

// 设置 Canvas 尺寸
canvas.width = 350;
canvas.height = 350;
const centerX = canvas.width / 2;
const centerY = canvas.height / 2;
const radius = centerX;

let items = []; // 存储转盘数据的数组
const colors = ['#f1c40f', '#e67e22', '#e74c3c', '#9b59b6', '#3498db', '#2ecc71', '#1abc9c', '#34495e'];

// --- 核心函数：获取数据并绘制转盘 ---

async function fetchAndDrawRoulette() {
    try {
        const response = await fetch('/api/roulette');
        items = await response.json();

        if (items.length === 0) {
            resultDisplay.textContent = '请先在下方添加食物选项！';
            drawEmptyRoulette();
            return;
        }

        drawRoulette();
        renderEditor(); // 重新渲染编辑区域
    } catch (error) {
        console.error('Error fetching roulette data:', error);
        resultDisplay.textContent = '加载数据失败，请检查服务器。';
        drawEmptyRoulette();
    }
}

function drawEmptyRoulette() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#ecf0f1';
    ctx.fill();
    ctx.font = '16px Arial';
    ctx.fillStyle = '#7f8c8d';
    ctx.textAlign = 'center';
    ctx.fillText('无数据', centerX, centerY);
}


function drawRoulette() {
    if (items.length === 0) return;

    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let startAngle = 0;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    items.forEach((item, index) => {
        // 计算扇形角度
        const arc = (item.weight / totalWeight) * 2 * Math.PI;
        const endAngle = startAngle + arc;

        // 绘制扇形
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = colors[index % colors.length];
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();

        // 绘制文字 (食物名称)
        ctx.save();
        ctx.fillStyle = '#000';
        ctx.font = '14px Arial';
        ctx.textAlign = 'right';

        // 移动到扇形中心点进行旋转
        const middleAngle = startAngle + arc / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate(middleAngle);

        // 文字位置 (距离中心点 2/3 半径处)
        ctx.fillText(item.food, radius * 0.65, 0);
        ctx.restore();

        startAngle = endAngle;
    });
}

// --- 编辑器相关函数 ---

function renderEditor() {
    itemsContainer.innerHTML = '';
    items.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'item-row';
        row.innerHTML = `
            <input type="text" name="food-${index}" value="${item.food}" required>
            <input type="number" name="weight-${index}" value="${item.weight}" min="1" required>
            <button type="button" class="remove-button" data-index="${index}">移除</button>
        `;
        itemsContainer.appendChild(row);
    });

    // 重新绑定移除按钮事件
    document.querySelectorAll('.remove-button').forEach(button => {
        button.addEventListener('click', function() {
            // 通过 index 来删除 items 数组中的元素
            const indexToRemove = parseInt(this.getAttribute('data-index'));
            items.splice(indexToRemove, 1);
            renderEditor(); // 重新渲染列表
            drawRoulette(); // 实时更新转盘显示
        });
    });
}

function addItemRow() {
    items.push({ food: '', weight: 1 }); // 添加一个默认空项
    renderEditor();
}

editorForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    spinButton.disabled = true;
    resultDisplay.textContent = '正在保存并更新...';

    const newItems = [];
    const formRows = document.querySelectorAll('.item-row');

    // 从表单中收集数据
    formRows.forEach((row, index) => {
        const food = row.querySelector(`input[name="food-${index}"]`).value.trim();
        const weight = parseInt(row.querySelector(`input[name="weight-${index}"]`).value);

        if (food && weight > 0) {
            newItems.push({ food, weight });
        }
    });

    if (newItems.length === 0) {
        alert('食物列表不能为空！');
        spinButton.disabled = false;
        return;
    }

    try {
        const response = await fetch('/api/roulette/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newItems)
        });

        if (response.ok) {
            resultDisplay.textContent = '转盘更新成功！';
            await fetchAndDrawRoulette(); // 重新加载数据和转盘
        } else {
            resultDisplay.textContent = '更新失败：' + (await response.json()).error;
        }
    } catch (error) {
        console.error('Update error:', error);
        resultDisplay.textContent = '网络错误，更新失败。';
    } finally {
        spinButton.disabled = false;
    }
});

addItemButton.addEventListener('click', addItemRow);


// --- 旋转逻辑 ---

spinButton.addEventListener('click', async () => {
    if (items.length === 0) {
        alert('请先添加食物选项！');
        return;
    }

    spinButton.disabled = true;
    resultDisplay.textContent = '🚀 正在旋转...';

    try {
        const response = await fetch('/api/roulette/spin', { method: 'POST' });
        const data = await response.json();

        const selectedFood = data.selectedFood;
        const currentItems = data.items;

        // 1. 计算目标食物的起始角度
        const totalWeight = currentItems.reduce((sum, item) => sum + item.weight, 0);
        let cumulativeAngle = 0;
        let targetStartAngle = 0;
        let targetArc = 0;

        for (const item of currentItems) {
            const arc = (item.weight / totalWeight) * 360;
            if (item.food === selectedFood) {
                targetStartAngle = cumulativeAngle;
                targetArc = arc;
                break;
            }
            cumulativeAngle += arc;
        }

        // 2. 确定停止位置 (指针在 0 度，扇区停在 0 度以下)
        // 目标停止角度 = (目标扇区中点) - 90度 (指针位置)
        const targetStopPosition = targetStartAngle + targetArc / 2;

        // 3. 计算最终旋转角度
        // 360 - targetStopPosition 将目标位置转到指针位置
        // 5 * 360 确保至少转 5 圈
        // Math.random() * targetArc - targetArc/2 增加一个在扇区内的小随机偏移
        let finalRotation =
            (360 - targetStopPosition)
            + (5 * 360)
            + (Math.random() * targetArc - targetArc/2);


        // 4. 执行动画
        canvas.style.transform = `rotate(${finalRotation}deg)`;

        // 动画结束后显示结果
        setTimeout(() => {
            resultDisplay.textContent = `🎉 恭喜！你今天要吃：${selectedFood} 🎉`;
            spinButton.disabled = false;
        }, 5000); // 这里的 5000ms 必须与 CSS 中的 transition 时间保持一致

    } catch (error) {
        console.error('Spin error:', error);
        resultDisplay.textContent = '旋转失败，请检查服务器连接。';
        spinButton.disabled = false;
    }
});


// --- 初始化 ---
document.addEventListener('DOMContentLoaded', fetchAndDrawRoulette);