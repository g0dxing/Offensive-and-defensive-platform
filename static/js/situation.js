// 态势大屏专用JavaScript
let autoScrollEnabled = true;
let logCounter = 0;
let currentTeams = [];
let currentTargets = [];
let isDragging = false;
let startX, startY;
let scrollLeft, scrollTop;
let lastHighRiskAlert = null;
let alertTimeout = null;

// 信息面板控制函数
function showInfoPanel() {
    document.getElementById('infoPanel').classList.remove('hidden');
    document.getElementById('overlay').classList.remove('hidden');
}

function closeInfoPanel() {
    document.getElementById('infoPanel').classList.add('hidden');
    document.getElementById('overlay').classList.add('hidden');
}

// 显示红队信息
async function showTeamInfo(team, attackLogs = []) {
    document.getElementById('infoTitle').textContent = `队伍信息 - ${team.team_name}`;
    const teamRank = currentTeams.findIndex(t => t.id === team.id) + 1;
    const rankText = teamRank > 0 ? `#${teamRank}` : '未知';
    const capturedTargets = await getCapturedTargets(team.id);

    const content = `
    <div class="space-y-3">
        <div class="info-item">
            <span class="info-label">队伍名称:</span>
            <span class="info-value">${team.team_name}</span>
        </div>
        <div class="info-item">
            <span class="info-label">成员数量:</span>
            <span class="info-value">${team.member_count} 人</span>
        </div>
        <div class="info-item">
            <span class="info-label">当前积分:</span>
            <span class="info-value text-yellow-400">${team.total_score}</span>
        </div>
        <div class="info-item">
            <span class="info-label">排名:</span>
            <span class="info-value">${rankText}</span>
        </div>
        ${capturedTargets.length > 0 ? `
        <div class="mt-4">
            <h4 class="text-green-400 font-semibold mb-2">已攻下靶标 (${capturedTargets.length}个)</h4>
            <div class="attack-list space-y-2">
                ${capturedTargets.map(target => `
                    <div class="bg-green-900 p-2 rounded text-sm">
                        <div class="flex justify-between">
                            <span class="text-white font-semibold">${target.name}</span>
                            <span class="text-yellow-400">+${target.points}分</span>
                        </div>
                        <div class="text-green-300 text-xs">IP: ${target.ip_address}</div>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : '<div class="text-gray-400 text-center py-4">暂未攻下任何靶标</div>'}
    </div>
    `;

    document.getElementById('infoContent').innerHTML = content;
    showInfoPanel();
}

// 获取队伍已攻下的靶标
async function getCapturedTargets(teamId) {
    try {
        const response = await axios.get(`/api/admin/teams/${teamId}/captured_targets`);
        if (response.data.success) {
            return response.data.captured_targets;
        }
    } catch (error) {
        console.error('获取已攻下靶标失败:', error);
    }
    return [];
}

// 显示靶标信息
async function showTargetInfo(target, attackLogs = []) {
    document.getElementById('infoTitle').textContent = `靶标信息 - ${target.name}`;
    const capturedTeamsCount = await getTargetCapturedTeams(target.id);

    const content = `
    <div class="space-y-3">
        <div class="info-item">
            <span class="info-label">靶标名称:</span>
            <span class="info-value">${target.name}</span>
        </div>
        <div class="info-item">
            <span class="info-label">IP地址:</span>
            <span class="info-value text-red-400">${target.ip_address}</span>
        </div>
        <div class="info-item">
            <span class="info-label">分值:</span>
            <span class="info-value text-yellow-400">${target.points} 分</span>
        </div>
        <div class="info-item">
            <span class="info-label">状态:</span>
            <span class="info-value text-green-400">在线</span>
        </div>
        <div class="info-item">
            <span class="info-label">被攻破情况:</span>
            <span class="info-value ${capturedTeamsCount > 0 ? 'text-red-400' : 'text-green-400'}">
                ${capturedTeamsCount > 0 ? `已被 ${capturedTeamsCount} 个队伍攻破` : '未被攻破'}
            </span>
        </div>
        ${target.description ? `
        <div class="info-item">
            <span class="info-label">描述:</span>
            <span class="info-value text-sm">${target.description}</span>
        </div>
        ` : ''}
        ${attackLogs.length > 0 ? `
        <div class="mt-4">
            <h4 class="text-red-400 font-semibold mb-2">被攻击记录 (${attackLogs.length}次)</h4>
            <div class="attack-list space-y-2">
                ${attackLogs.slice(0, 10).map(log => `
                    <div class="bg-gray-800 p-2 rounded text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-300">${log.source_ip || '未知来源'}</span>
                            <span class="text-red-400">${new Date(log.timestamp).toLocaleTimeString('zh-CN')}</span>
                        </div>
                        <div class="text-gray-400 text-xs">${log.attack_type || '未知类型'} - 流量: ${log.traffic_volume || 0}KB</div>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : '<div class="text-gray-400 text-center py-4">暂无详细攻击日志</div>'}
    </div>
    `;

    document.getElementById('infoContent').innerHTML = content;
    showInfoPanel();
}

// 获取攻破特定靶标的队伍数量
async function getTargetCapturedTeams(targetId) {
    try {
        const response = await axios.get(`/api/admin/targets/${targetId}/captured_teams`);
        if (response.data.success) {
            return response.data.captured_teams_count;
        }
    } catch (error) {
        console.error('获取靶标攻破队伍数量失败:', error);
    }
    return 0;
}

// 获取攻击日志数据
async function getTeamAttackLogs(teamId) {
    try {
        const response = await axios.get(`/api/admin/logs?type=attack&limit=50`);
        if (response.data.success) {
            return response.data.logs.filter(log =>
                (log.team_id === teamId || log.message.includes('RedTeam')) &&
                log.target_ip &&
                log.timestamp &&
                !isNaN(new Date(log.timestamp).getTime())
            );
        }
    } catch (error) {
        console.error('获取攻击日志失败:', error);
    }
    return [];
}

async function getTargetAttackLogs(targetIP) {
    try {
        const response = await axios.get(`/api/admin/logs?type=attack&limit=50`);
        if (response.data.success) {
            return response.data.logs.filter(log =>
                log.message.includes(targetIP) ||
                (log.target_ip === targetIP)
            );
        }
    } catch (error) {
        console.error('获取攻击日志失败:', error);
    }
    return [];
}

// 态势大屏初始化
function initSituation() {
    loadSituationData();
    updateSystemTime();
    initDragFlow();
    updateFlowStyle();
    startLogStream();

    setInterval(updateSystemTime, 1000);
    setInterval(loadSituationData, 5000);
    setInterval(simulateAttackFlow, 3000);

    window.addEventListener('scoreUpdate', function (event) {
        updateRankings(event.detail.teams);
    });

    window.addEventListener('logUpdate', function (event) {
        addLogEntry(event.detail);
    });
}

// 加载态势数据
async function loadSituationData() {
    try {
        const response = await axios.get('/api/situation/data');
        if (response.data.success) {
            const data = response.data;

            if (data.competition) {
                document.getElementById('competitionName').textContent = data.competition.name;
                const statusElement = document.getElementById('competitionStatus');
                if (data.competition.is_active) {
                    statusElement.innerHTML = '<span class="status-indicator status-online"></span>比赛进行中';
                } else {
                    statusElement.innerHTML = '<span class="status-indicator status-offline"></span>比赛未开始';
                }
            }

            document.getElementById('activeTeams').textContent = data.teams ? data.teams.length : 0;
            document.getElementById('totalAttacks').textContent = data.statistics ? data.statistics.total_attacks : 0;
            document.getElementById('flagsCaptured').textContent = data.statistics ? data.statistics.flags_captured : 0;

            currentTeams = data.teams || [];
            currentTargets = data.targets || [];

            updateAttackFlow(currentTeams, currentTargets);
            updateRankings(currentTeams);

            if (!window.initialLogsLoaded) {
                if (data.logs) {
                    data.logs.forEach(log => {
                        if (log.type === 'attack' && log.message) {
                            extractTargetIPFromLog(log.message);
                        }
                        addLogEntry(log);
                    });
                }
                window.initialLogsLoaded = true;
            }
        }
    } catch (error) {
        console.error('加载态势数据失败:', error);
    }
}

// 更新排行榜
function updateRankings(teams) {
    const rankingsList = document.getElementById('rankingsList');
    if (!teams || teams.length === 0) {
        rankingsList.innerHTML = '<div class="text-center text-gray-400 py-8"><i class="fas fa-trophy mr-2"></i>暂无队伍数据</div>';
        return;
    }

    rankingsList.innerHTML = teams.slice(0, 15).map((team, index) => `
        <div class="ranking-item p-3 rounded flex items-center justify-between">
            <div class="flex items-center space-x-3">
                <div class="w-8 h-8 flex items-center justify-center rounded-full ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-yellow-600' : 'bg-gray-600'}">
                    <span class="text-white text-sm font-bold">${index + 1}</span>
                </div>
                <div>
                    <div class="font-semibold text-white text-sm">${team.team_name}</div>
                    <div class="text-gray-400 text-xs">${team.member_count} 成员</div>
                </div>
            </div>
            <div class="text-right">
                <div class="text-yellow-400 font-bold">${team.total_score}</div>
                <div class="text-gray-400 text-xs">积分</div>
            </div>
        </div>
    `).join('');
}

// 启动日志流
function startLogStream() {
    const logStream = document.getElementById('logStream');
    logStream.innerHTML = '';
    const initialLogs = [
        { type: 'system', message: 'WebSocket连接已建立', severity: 'low' },
        { type: 'login', message: '系统管理员已连接', severity: 'low' },
        { type: 'system', message: '实时态势大屏启动完成', severity: 'low' }
    ];

    initialLogs.forEach(log => {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${log.type || 'system'}`;
        logEntry.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                    <span class="text-gray-500">[${(++logCounter).toString().padStart(4, '0')}]</span>
                    <span class="text-gray-500">${new Date().toLocaleTimeString()}</span>
                    <i class="fas ${log.type === 'login' ? 'fa-sign-in-alt' : 'fa-cog'} text-green-400"></i>
                    <span class="text-gray-300">${log.message}</span>
                </div>
                <div class="text-xs text-green-400 uppercase">${log.severity}</div>
            </div>
        `;
        logStream.appendChild(logEntry);
    });
}

// 添加日志条目
function addLogEntry(logData) {
    const logStream = document.getElementById('logStream');
    logCounter++;

    if (logStream.children.length === 1 && logStream.firstChild.textContent.includes('正在连接')) {
        logStream.innerHTML = '';
    }

    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${logData.type || 'system'}`;

    const timestamp = logData.timestamp ? new Date(logData.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
    const severityColor = {
        'low': 'text-green-400', 'medium': 'text-yellow-400', 'high': 'text-red-400', 'critical': 'text-red-600 font-bold'
    }[logData.severity || 'medium'] || 'text-gray-400';

    const typeIcon = {
        'login': 'fa-sign-in-alt', 'attack': 'fa-bolt', 'system': 'fa-cog', 'error': 'fa-exclamation-triangle',
        'success': 'fa-check-circle', 'warning': 'fa-exclamation-circle'
    }[logData.type || 'system'] || 'fa-file-alt';

    logEntry.innerHTML = `
    <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
            <span class="text-gray-500">[${logCounter.toString().padStart(4, '0')}]</span>
            <span class="text-gray-500">${timestamp}</span>
            <i class="fas ${typeIcon} ${severityColor}"></i>
            <span class="text-gray-300">${logData.message || '系统日志'}</span>
        </div>
        <div class="text-xs ${severityColor} uppercase">${logData.severity || 'info'}</div>
    </div>
    `;

    logStream.insertBefore(logEntry, logStream.firstChild);
    updateHighRiskAlert(logData);

    if (logData.type === 'attack' && logData.message &&
        !logData.message.includes('发起') && !logData.message.includes('RedTeam-')) {
        const totalAttacks = document.getElementById('totalAttacks');
        const currentCount = parseInt(totalAttacks.textContent) || 0;
        totalAttacks.textContent = currentCount + 1;
    }

    while (logStream.children.length > 100) {
        logStream.removeChild(logStream.lastChild);
    }

    if (autoScrollEnabled) {
        logStream.scrollTop = 0;
    }
}

// 动态生成攻击流量图
function updateAttackFlow(teams, targets) {
    const attackFlow = document.getElementById('attackFlow');
    attackFlow.innerHTML = '';

    const targetCount = targets ? targets.length : 0;
    const containerWidth = Math.max(1200, targetCount * 250);
    const contentContainer = document.createElement('div');
    contentContainer.style.cssText = `position: relative; width: ${containerWidth}px; height: 400px; min-width: ${containerWidth}px;`;
    attackFlow.appendChild(contentContainer);

    if (!teams || !targets) return;

    // 生成队伍节点
    teams.slice(0, 5).forEach((team, index) => {
        const top = 50;
        const left = 100 + (index * 200);
        const node = document.createElement('div');
        node.className = 'team-node';
        node.style.cssText = `top: ${top}px; left: ${left}px;`;
        node.title = `点击查看 ${team.team_name} 的详细信息`;
        node.textContent = team.team_name.substring(0, 3);
        node.addEventListener('click', async () => {
            const attackLogs = await getTeamAttackLogs(team.id);
            showTeamInfo(team, attackLogs);
        });
        contentContainer.appendChild(node);

        // 为每个队伍创建多条随机攻击线
        const attackLineCount = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < attackLineCount; i++) {
            if (targets.length > 0) {
                const targetIndex = Math.floor(Math.random() * targets.length);
                const target = targets[targetIndex];
                const targetLeft = 150 + (targetIndex * 220);
                const targetTop = 300;

                createStraightAttackLine(left + 30, top + 30, targetLeft + 40, targetTop, contentContainer);
            }
        }
    });

    // 生成所有靶标节点
    targets.forEach((target, index) => {
        const top = 300;
        const left = 150 + (index * 220);
        const node = document.createElement('div');
        node.className = 'target-node';
        node.style.cssText = `top: ${top}px; left: ${left}px;`;
        node.title = `点击查看 ${target.name} 的被攻击情况\nIP: ${target.ip_address}`;
        node.textContent = target.name.length > 8 ? `${target.name.substring(0, 8)}...` : target.name;
        node.addEventListener('click', async () => {
            const attackLogs = await getTargetAttackLogs(target.ip_address);
            showTargetInfo(target, attackLogs);
        });
        contentContainer.appendChild(node);
    });

    document.getElementById('targetCount').textContent = targetCount;
}

function createStraightAttackLine(startX, startY, endX, endY, container) {
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;

    const line = document.createElement('div');
    line.className = 'attack-line';
    line.style.cssText = `
        top: ${startY}px;
        left: ${startX}px;
        width: ${length}px;
        transform: rotate(${angle}deg);
        transform-origin: 0 0;
        animation-delay: ${Math.random() * 1.5}s;
    `;
    container.appendChild(line);
    createFlowParticles(startX, startY, endX, endY, container);
}

function createFlowParticles(startX, startY, endX, endY, container) {
    const particleCount = 3;
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'flow-particle';
        const progress = (i / particleCount) * 0.8;
        const currentX = startX + (endX - startX) * progress;
        const currentY = startY + (endY - startY) * progress;
        particle.style.cssText = `
            top: ${currentY}px;
            left: ${currentX}px;
            animation-delay: ${i * 0.3 + Math.random() * 0.5}s;
            animation-duration: ${1.5 + Math.random() * 1}s;
        `;
        container.appendChild(particle);
    }
}

function simulateAttackFlow() {
    const attackFlow = document.getElementById('attackFlow');
    const attackLines = attackFlow.querySelectorAll('.attack-line');
    const particles = attackFlow.querySelectorAll('.flow-particle');

    attackLines.forEach(line => {
        if (Math.random() > 0.8) {
            line.style.animationDuration = `${1 + Math.random() * 1}s`;
        }
    });

    particles.forEach(particle => {
        if (Math.random() > 0.9) {
            particle.style.animationDuration = `${1.5 + Math.random() * 1}s`;
        }
    });
}

// 拖拽功能
function initDragFlow() {
    const attackFlow = document.getElementById('attackFlow');
    attackFlow.addEventListener('mousedown', startDrag);
    attackFlow.addEventListener('mousemove', drag);
    attackFlow.addEventListener('mouseup', endDrag);
    attackFlow.addEventListener('mouseleave', endDrag);
    attackFlow.addEventListener('dragstart', (e) => e.preventDefault());
}

function startDrag(e) {
    const attackFlow = document.getElementById('attackFlow');
    isDragging = true;
    startX = e.pageX - attackFlow.offsetLeft;
    startY = e.pageY - attackFlow.offsetTop;
    scrollLeft = attackFlow.scrollLeft;
    scrollTop = attackFlow.scrollTop;
    attackFlow.style.cursor = 'grabbing';
}

function drag(e) {
    if (!isDragging) return;
    e.preventDefault();
    const attackFlow = document.getElementById('attackFlow');
    const x = e.pageX - attackFlow.offsetLeft;
    const y = e.pageY - attackFlow.offsetTop;
    const walkX = (x - startX) * 2;
    const walkY = (y - startY) * 2;
    attackFlow.scrollLeft = scrollLeft - walkX;
    attackFlow.scrollTop = scrollTop - walkY;
}

function endDrag() {
    isDragging = false;
    const attackFlow = document.getElementById('attackFlow');
    attackFlow.style.cursor = 'grab';
}

function updateFlowStyle() {
    const attackFlow = document.getElementById('attackFlow');
    attackFlow.style.cursor = 'grab';
    attackFlow.style.overflow = 'auto';
}

// 系统时间更新
function updateSystemTime() {
    const now = new Date();
    document.getElementById('systemTime').textContent = now.toLocaleTimeString('zh-CN');
}

// 全屏切换
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

// 刷新数据
function refreshData() {
    loadSituationData();
    showNotification('数据已刷新', 'success');
}

// 自动滚动切换
function toggleAutoScroll() {
    autoScrollEnabled = !autoScrollEnabled;
    const btn = document.getElementById('autoScrollBtn');
    if (autoScrollEnabled) {
        btn.innerHTML = '<i class="fas fa-pause"></i>';
        btn.title = '暂停自动滚动';
    } else {
        btn.innerHTML = '<i class="fas fa-play"></i>';
        btn.title = '启用自动滚动';
    }
}

// 清除日志
function clearLogs() {
    const logStream = document.getElementById('logStream');
    logStream.innerHTML = '<div class="text-center text-gray-400 py-8">日志已清空</div>';
    logCounter = 0;
}

// 高危告警
function updateHighRiskAlert(logData) {
    if (logData.severity === 'high' || logData.severity === 'critical') {
        const alertDiv = document.getElementById('highRiskAlert');
        const alertMessage = document.getElementById('alertMessage');

        lastHighRiskAlert = {
            message: logData.message,
            type: logData.type,
            severity: logData.severity,
            timestamp: new Date()
        };

        alertDiv.classList.remove('hidden');
        alertMessage.textContent = `${logData.severity === 'critical' ? '严重' : '高危'}告警: ${logData.message.substring(0, 30)}${logData.message.length > 30 ? '...' : ''}`;

        if (alertTimeout) {
            clearTimeout(alertTimeout);
        }

        alertTimeout = setTimeout(() => {
            alertDiv.classList.add('hidden');
        }, 30000);
    }
}

function clearAlert() {
    const alertDiv = document.getElementById('highRiskAlert');
    alertDiv.classList.add('hidden');
    if (alertTimeout) {
        clearTimeout(alertTimeout);
    }
}

// 键盘快捷键
document.addEventListener('keydown', function (e) {
    if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
    }
    if (e.key === 'r' && e.ctrlKey) {
        e.preventDefault();
        refreshData();
    }
    if (e.key === 'c' && e.ctrlKey) {
        e.preventDefault();
        clearLogs();
    }
});

window.addEventListener('beforeunload', function (e) {
    if (document.fullscreenElement) {
        e.preventDefault();
        e.returnValue = '';
    }
});