// public/script.js

const canvas = document.getElementById('rouletteCanvas');
const ctx = canvas.getContext('2d');
const spinButton = document.getElementById('spinButton');
const resultDiv = document.getElementById('result');
const itemsContainer = document.getElementById('itemsContainer');
const editorForm = document.getElementById('editorForm');

let items = [];
const colorPalette = ['#FFC72C', '#FF6633', '#C70039', '#8E44AD', '#3498DB', '#1ABC9C', '#2ECC71', '#F1C40F', '#E67E22'];


// --- 核心函数：获取数据并绘制 (放在调用之前) ---

async function fetchItems() {
    try {
        const response = await fetch('/api/roulette');
        items = await response.json();
        drawRoulette();
        renderEditor();
    } catch (error) {
        console.error('Error fetching items:', error);
        resultDiv.textContent = '无法加载转盘内容。';
    }
}

function drawRoulette() {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let startAngle = 0;

    // Canvas 尺寸应通过 attributes 获取
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
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
        ctx.fillText(item.food, radius - 20, 0);
        ctx.restore();

        startAngle = endAngle;
    });
}


// --- 核心函数：旋转逻辑 ---

async function spinRoulette() {
    spinButton.disabled = true;
    resultDiv.textContent = '正在思考吃什么...';

    try {
        const response = await fetch('/api/roulette/spin', { method: 'POST' });
        const result = await response.json();

        const selectedFood = result.selectedFood;
        const currentItems = result.items;

        const totalWeight = currentItems.reduce((sum, item) => sum + item.weight, 0);
        let accumulatedWeight = 0;
        let targetCenterAngle = 0;

        // 根据后端结果，计算指针应停止的中心角度
        for (const item of currentItems) {
            const angleDegrees = (item.weight / totalWeight) * 360;

            if (item.food === selectedFood) {
                targetCenterAngle = accumulatedWeight + (angleDegrees / 2);
                break;
            }
            accumulatedWeight += angleDegrees;
        }

        // 计算最终旋转角度
        const spinRounds = 5;
        const totalRotation = (spinRounds * 360) + (360 - targetCenterAngle);

        // 执行旋转动画
        const rouletteWrapper = document.querySelector('.roulette-wrapper');
        rouletteWrapper.style.transition = 'transform 4s cubic-bezier(0.2, 0.9, 0.4, 1)';
        rouletteWrapper.style.transform = `rotate(${totalRotation}deg)`;

        // 动画结束处理
        rouletteWrapper.addEventListener('transitionend', function handler() {
            spinButton.disabled = false;
            resultDiv.textContent = `🎉 恭喜！今天吃: ${selectedFood} 🎉`;

            rouletteWrapper.removeEventListener('transitionend', handler);

            // 保持当前显示状态，但清除动画属性
            rouletteWrapper.style.transition = 'none';
            rouletteWrapper.style.transform = `rotate(${totalRotation % 360}deg)`;

            setTimeout(() => {
                rouletteWrapper.style.transition = 'transform 4s cubic-bezier(0.2, 0.9, 0.4, 1)';
            }, 50);

        });

    } catch (error) {
        console.error('Spin failed:', error);
        resultDiv.textContent = '旋转失败，请检查服务器连接。';
        spinButton.disabled = false;
    }
}


// --- 编辑器和更新逻辑 ---

function renderEditor() {
    itemsContainer.innerHTML = '';
    items.forEach(item => {
        addItemField(item.food, item.weight);
    });
}

function addItemField(food = '', weight = 10) {
    const div = document.createElement('div');
    div.classList.add('item-field');
    div.innerHTML = `
        <input type="text" class="food-input" placeholder="食物名称" value="${food}" required>
        <input type="number" class="weight-input" min="1" max="100" value="${weight}" required>
        <button type="button" class="remove-item-button">移除</button>
    `;
    div.querySelector('.remove-item-button').addEventListener('click', () => {
        div.remove();
    });
    itemsContainer.appendChild(div);
}

async function handleUpdate(event) {
    event.preventDefault();
    const newItems = [];
    const fields = itemsContainer.querySelectorAll('.item-field');

    fields.forEach(field => {
        const food = field.querySelector('.food-input').value.trim();
        const weight = parseInt(field.querySelector('.weight-input').value);
        if (food && weight > 0) {
            newItems.push({ food, weight });
        }
    });

    if (newItems.length === 0) {
        alert('请至少添加一项食物！');
        return;
    }

    try {
        const response = await fetch('/api/roulette/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newItems)
        });

        if (response.ok) {
            alert('转盘内容更新成功！');
            fetchItems(); // 重新加载数据并绘制转盘
        } else {
            const error = await response.json();
            alert('更新失败: ' + (error.error || response.statusText));
        }
    } catch (error) {
        console.error('Update error:', error);
        alert('网络请求失败，请检查服务器连接。');
    }
}


// --- 初始化 (放在所有函数定义之后) ---
document.addEventListener('DOMContentLoaded', () => {
    fetchItems();
    editorForm.addEventListener('submit', handleUpdate);
    spinButton.addEventListener('click', spinRoulette);
    document.getElementById('addItemButton').addEventListener('click', addItemField);
});