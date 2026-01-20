const PROFIT_PER_LEVEL = 300;
const PRICE_MULTIPLIER = 2;
const TARGET_HIRES = 4;
const CANDIDATE_NAMES = [
  'Алексей','Мария','Иван','Екатерина','Дмитрий','Ольга','Никита','Анна','Сергей','Олеся',
  'Игорь','Наталья','Роман','Юлия','Владимир','Ксения','Павел','Алина','Максим','Татьяна'
];
const CANDIDATE_AVATARS = ['🧑‍💻','👩‍🎨','👨‍🔬','🧑‍💼','👩‍💼','👨‍💻','🧑‍🔧','👩‍🔧','🧑‍🎨','👨‍🎨'];
const dayGoals = {
  1: [
    "Нанять 4 сотрудников",
    "Не уйти в минус по финансам",
    "Подобрать команду с хорошим настроением"
  ],
  2: [
    "Вывести команду в плюс по прибыли",
    "Прокачать всех сотрудников минимум 1 раз"
  ]
};

// Грейды сотрудников
const GRADES = ['Junior', 'Middle', 'Senior', 'Lead'];
// Управление тиком (чтобы можно было запускать/останавливать)
let tickIntervalId = null;
let gameStarted = false;

// ---------------- Pause control ----------------
let isPaused = false;       // текущее состояние паузы
let gameRunning = false;    // true, когда тик запущен (day started and interval set)

// Установить паузу (true = пауза активна — баланс не меняется)
function setPaused(pause) {
  const pauseBtn = document.querySelector('.pause-btn');
  if (pause === isPaused) return;

  isPaused = !!pause;

  if (pauseBtn) pauseBtn.textContent = isPaused ? '▶' : '⏸';

  updateUI();
}


function togglePause() {
  setPaused(!isPaused);
}


let gameState = {
  balance: 100000, // Начальный баланс - компания в минусе из-за продакт-менеджера
  teamBudget: 50000, // Начальный бюджет команды
  incomePerSecond: -356, // Начальная прибыль от продакт-менеджера (в минусе)
  day: 1,
  employees: {
    pm: { 
      name: 'Продакт менеджер', 
      level: 0, 
      grade: 0, // 0 = Junior
      hired: true, // Уже нанят изначально
      baseProfit: -356, 
      basePrice: 10000, 
      desc: 'Продакт-менеджер — специалист, отвечающий за ценность продукта. Он формулирует проблему пользователя, определяет цели продукта, приоритизирует задачи и координирует работу команды для достижения бизнес-результатов. Продакт-менеджер связывает бизнес-цели с техническими возможностями и следит за тем, чтобы продукт решал реальные проблемы пользователей.' 
    },
    designer: { 
      name: 'Дизайнер', 
      level: 0, 
      grade: 0,
      hired: false, 
      baseProfit: -200, 
      basePrice: 8000, 
      desc: 'Дизайнер создает визуальный облик продукта: интерфейсы, иконки, анимации. Он продумывает пользовательский опыт (UX) и делает продукт удобным и красивым. Хороший дизайн повышает конверсию и удовлетворенность пользователей. Дизайнер работает в тесной связке с продакт-менеджером и разработчиками, чтобы создать продукт, который не только выглядит хорошо, но и работает интуитивно.' 
    },
    analyst: { 
      name: 'Аналитик', 
      level: 0, 
      grade: 0,
      hired: false, 
      baseProfit: -150, 
      basePrice: 9000, 
      desc: 'Аналитик собирает и анализирует данные о продукте: метрики использования, поведение пользователей, конверсии. Он помогает принимать решения на основе данных и находить точки роста продукта. Аналитик работает с инструментами аналитики, проводит A/B тесты и помогает команде понять, какие функции продукта действительно нужны пользователям, а какие можно улучшить или убрать.' 
    },
    marketer: { 
      name: 'Маркетолог', 
      level: 0, 
      grade: 0,
      hired: false, 
      baseProfit: -100, 
      basePrice: 7000, 
      desc: 'Маркетолог привлекает пользователей к продукту: создает рекламные кампании, работает с контентом, анализирует каналы привлечения. Он помогает продукту найти свою аудиторию и увеличить количество пользователей. Маркетолог определяет целевую аудиторию, выбирает каналы продвижения и измеряет эффективность маркетинговых активностей, чтобы привлекать пользователей с наименьшими затратами.' 
    },
  }
};

let candidates = [];
let candidateIndex = 0;
let currentRole = null;
let dayEnded = false;
let isInitialLoad = true;
let hasShownEndScreen = false; // Флаг, чтобы не показывать экран дважды

function saveGame() {
  localStorage.setItem('idleGame', JSON.stringify(gameState));
}
function mapRange(value, a1, a2, b1, b2) {
  if (a2 === a1) return b1;
  const t = (value - a1) / (a2 - a1);
  return b1 + t * (b2 - b1);
}
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function prepareDay(day) {
  // Подготовка стартового состояния для заданного дня.
  // day === 1  -> ничего экстра не делаем (игрок начинает с текущего сохранения)
  // day === 2  -> создаём "новую" команду: все наняты, все в минусе, нельзя выбирать кандидатов
  dayEnded = false;          // сбрасываем
  hasShownEndScreen = false; // сбрасываем
  isInitialLoad = true;
  if (day === 2) {
    gameState.balance = 200000;
    const roleAvatars = {
      pm: '👨‍💼',
      designer: '🎨',
      analyst: '📊',
      marketer: '📣'
    };

    for (let key in gameState.employees) {
      const emp = gameState.employees[key];
      emp.hired = true;
      if (!emp.displayName) emp.displayName = emp.name;
      if (!emp.avatar) emp.avatar = roleAvatars[key] || '👤';
      // Игрок должен улучшать — начинаем с уровня 0
      emp.level = 0;
      // (Опция) Сбрасываем грейд в Junior — если не хотим этого, закомментируй следующую строку
      emp.grade = 0;
      // Сильно отрицательная базовая прибыль — игроку нужно апгрейдать
      emp.baseProfit = - (PROFIT_PER_LEVEL + Math.floor(Math.random() * 200));
      // Оставляем emp.basePrice как есть
    }
  }

  // Пересчёт и рендер
  recalcIncome();
  saveGame();
}
function showDayIntro(day) {
  const intro = document.getElementById("dayIntroOverlay");
  const title = document.getElementById("dayTitle");

  title.textContent = `День ${day}`;
  intro.classList.remove("hidden");

  setTimeout(() => {

    intro.classList.add("fade-out");

    setTimeout(() => {
      intro.classList.add("hidden");
      intro.classList.remove("fade-out");
      showDayGoals(day);
    }, 1200); // fade-out

  }, 3000); // держим надпись 3 секунды
}

function showDayGoals(day) {
  const screen = document.getElementById("dayGoalsScreen");
  const list = document.getElementById("goalsList");

  list.innerHTML = "";

  dayGoals[day].forEach(goal => {
    const li = document.createElement("li");
    li.textContent = goal;
    list.appendChild(li);
  });

  screen.classList.remove("hidden");

  document.getElementById("startDayBtn").onclick = () => {
    startDayFromGoals(day);
  };
}
function startDayFromGoals(day) {
  const screen = document.getElementById("dayGoalsScreen");

  screen.classList.add("fade-out");

  setTimeout(() => {
    screen.classList.add("hidden");
    screen.classList.remove("fade-out");

    startDayFromIntro();

  }, 400);
}



function closeDayIntro() {
  const intro = document.getElementById('dayIntroScreen');
  if (intro) intro.classList.add('hidden');
  // Разблокируем проверки, если нужно — но обычно оставляем isInitialLoad=true до старта
}

function showMainMenu() {
  document.getElementById('mainMenu').style.display = 'flex';
}

function hideMainMenu() {
  document.getElementById('mainMenu').style.display = 'none';
}

function startGameFromMenu() {
  hideMainMenu();
  showDayIntro(1);   // экран целей дня (ты уже планировал)
}


function startDayFromIntro() {
  const intro = document.getElementById('dayIntroScreen');
  if (intro) intro.classList.add('hidden');
  isInitialLoad = false;


  // Подготовка дня (создаём команду/назначаем параметры, если нужно)
  prepareDay(gameState.day);
  if (gameState.day === 1 && !localStorage.getItem("onboardingDone")) {
    startOnboarding();
    localStorage.setItem("onboardingDone", "true");
  }
  

  // Запускаем тик (если уже был — очищаем)
  // Запускаем тик (если уже был — очищаем)
  if (tickIntervalId) {
    clearInterval(tickIntervalId);
    tickIntervalId = null;
  }
  tickIntervalId = setInterval(tick, 1000);
  gameRunning = true;
  // И сразу обновляем иконку паузы
  const pauseBtn = document.querySelector('.pause-btn');
  if (pauseBtn) pauseBtn.textContent = '⏸';
  updateUI();


}


function loadGame() {
  const data = localStorage.getItem('idleGame');
  if (data) {
    try {
      const loaded = JSON.parse(data);
      gameState = loaded;
      // При загрузке из сохранения не показываем экран завершения сразу
    } catch (e) {
      console.error('Ошибка загрузки сохранения:', e);
      // Если ошибка загрузки, используем начальное состояние
    }
  }
}

function calculateEmployeeProfit(emp) {
  if (!emp.hired) return 0;
  // Прибыль зависит от грейда (level) сотрудника
  return emp.baseProfit + emp.level * PROFIT_PER_LEVEL;
}

function getEmployeeGrade(emp) {
  return GRADES[emp.grade] || GRADES[0];
}

function calculateUpgradePrice(emp) {
  return Math.floor(emp.basePrice * Math.pow(PRICE_MULTIPLIER, emp.level));
}

function recalcIncome() {
  let sum = 0;
  for (let k in gameState.employees) {
    sum += calculateEmployeeProfit(gameState.employees[k]);
  }
  gameState.incomePerSecond = sum;
}

function hiredCount() {
  return Object.values(gameState.employees).filter(e => e.hired).length;
}


function formatNumber(num) {
  const absNum = Math.abs(num);
  const formatted = Math.floor(absNum).toLocaleString('ru-RU').replace(/,/g, ' ');
  return num < 0 ? `-${formatted}` : formatted;
}

function updateUI() {
  // Обновление баланса
  document.querySelectorAll('#balance').forEach(el => {
    el.textContent = formatNumber(gameState.balance);
  });
  
// Обновление дохода в нижней панели
  const incomeEl = document.getElementById('income');
  const incomeDisplay = document.querySelector('.income-display');
  if (incomeEl) {
    const income = gameState.incomePerSecond;
    incomeEl.textContent = income >= 0 ? `+${formatNumber(income)}` : formatNumber(income);
    
    // Меняем класс в зависимости от знака прибыли
    if (incomeDisplay) {
      incomeDisplay.classList.toggle('negative', income < 0);
      const arrow = incomeDisplay.querySelector('.income-arrow');
      if (arrow) {
        arrow.textContent = income >= 0 ? '↑' : '↓';
      }
    }
  }
  
  // Обновление дня
  const dayEl = document.getElementById('dayNumber');
  if (dayEl) {
    dayEl.textContent = gameState.day;
  }
  
  // Обновление бюджета команды
  const budgetEl = document.getElementById('teamBudget');
  if (budgetEl) {
    budgetEl.textContent = formatNumber(gameState.teamBudget);
  }
  
  // Обновление бюджета в нижней панели
  const budgetBottomEl = document.getElementById('teamBudgetBottom');
  if (budgetBottomEl) {
    budgetBottomEl.textContent = formatNumber(gameState.teamBudget);
  }
  
  // Обновление прибыли команды (внутри боковой панели)
  const teamProfitEl = document.getElementById('teamProfitAmount');
  const teamProfitContainer = document.getElementById('teamProfit');
  if (teamProfitEl && teamProfitContainer) {
    const profit = gameState.incomePerSecond;
    const profitText = profit >= 0 ? `+${formatNumber(profit)}` : formatNumber(profit);
    teamProfitEl.textContent = profitText;
    
    // Исправлено: теперь четко переключаем классы
    teamProfitContainer.classList.toggle('positive', profit >= 0);
    // Класс 'profit-value' остается всегда, а цвет меняется через positive/default CSS
    const icon = teamProfitContainer.querySelector('.profit-icon');
    if (icon) {
      icon.textContent = profit >= 0 ? '↑' : '↓';
    }
  }
  
  // Обновление количества сотрудников
  const employeesCountEl = document.getElementById('employeesCount');
  if (employeesCountEl) {
    employeesCountEl.textContent = hiredCount();
  }

  // Обновление списка сотрудников
  const container = document.getElementById('employees');
  if (container) {
    container.innerHTML = '';

    for (let key in gameState.employees) {
      const emp = gameState.employees[key];
      const profit = calculateEmployeeProfit(emp);
      const price = calculateUpgradePrice(emp);
    
      const profitText = profit >= 0 ? `+${formatNumber(profit)}` : formatNumber(profit);
      const profitClass = profit >= 0 ? 'positive' : 'negative';
    
      let actionBtn = '';
      let candidateSelector = '';
    
      // Определяем отображаемое имя и аватар (если сотрудник уже нанят — показываем данные кандидата)
      const avatarDisplay = emp.hired ? (emp.avatar || '😊') : '';
      // Если нанят — показываем имя кандидата + роль справа небольшим серым текстом.
      const nameHtml = emp.hired
        ? `<span class="candidate-name">${emp.displayName || emp.name}</span><span class="emp-role">${emp.name}</span>`
        : `<span class="emp-role">${emp.name}</span>`;
    
      // Класс для затемнения ненанятых (мы уже ограничили затемнение только на avatar и роль в CSS)
      const notHiredClass = emp.hired ? '' : 'not-hired';
    
      if (!emp.hired) {
        const isHidden = (currentRole === key) ? '' : 'hidden';
    
        candidateSelector = `
          <div class="candidate-selector-panel ${isHidden}" id="candidateSelector-${key}">
            <div class="candidate-selector">
              <button class="candidate-nav-btn" onclick="nextCandidate(-1, '${key}')">◀</button>
              <div class="candidate-info" id="candidateInfo-${key}"></div>
              <button class="candidate-nav-btn" onclick="nextCandidate(1, '${key}')">▶</button>
            </div>
            <button class="hire-btn" onclick="hireCurrent('${key}')">Нанять</button>
          </div>
        `;
        actionBtn = `
          <div class="employee-actions">
            <button class="select-candidate-btn" onclick="openHire('${key}')">Выбрать кандидата...</button>
          </div>
        `;
      } else {
        actionBtn = `
          <div class="employee-actions">
            <div class="upgrade-price">
              <span class="coin-icon">🪙</span>
              <span>${formatNumber(price)}P</span>
            </div>
            <button class="upgrade-btn" onclick="upgrade('${key}')">Улучшить</button>
          </div>
        `;
      }
    
      const gradeText = emp.hired ? getEmployeeGrade(emp) : '';
    
      // соответствие индекса грейда к классу для цвета бейджа
      const gradeClasses = ['junior', 'middle', 'senior', 'lead'];
      const gradeClass = (typeof emp.grade === 'number') ? (gradeClasses[emp.grade] || '') : '';
    
      const div = document.createElement('div');
      div.className = `employee ${notHiredClass}`;
      div.innerHTML = `
        <div class="emp-row">
          <div class="employee-avatar">${avatarDisplay}</div>
          <div class="emp-info">
            <div class="emp-name">
              ${nameHtml}
              ${emp.hired && gradeText ? `<span class="grade-badge ${gradeClass}">${gradeText}</span>` : ''}
              <span class="tooltip-icon" data-tooltip="${emp.desc}">?</span>
            </div>
            ${emp.hired ? `<span class="profit-chip ${profitClass}">${profitText}P/сек</span>` : ''}
          </div>
        </div>
        ${actionBtn}
        ${candidateSelector}
      `;
      container.appendChild(div);
    }
     
  }
if (currentRole) {
    showCandidateInPanel();
  }

  // Обновление задачи
  const taskTextEl = document.getElementById('taskText');
  if (taskTextEl) {
    const remaining = TARGET_HIRES - hiredCount();
    if (remaining > 0) {
      taskTextEl.innerHTML = `<span class="task-icon">✨</span>Нанять ${remaining} сотрудников`;
    } else if (dayEnded) {
      taskTextEl.innerHTML = `<span class="task-icon">✨</span>День завершен`;
    } else {
      taskTextEl.innerHTML = `<span class="task-icon">✨</span>Выйти из минуса`;
    }
  }

  // Проверяем завершение дня только если действительно нанято нужное количество
  // И только если это не начальная загрузка игры и экран еще не показывался
  if (gameState.day === 1) {
    if (hiredCount() >= TARGET_HIRES && !dayEnded && !isInitialLoad && !hasShownEndScreen) {
      const hasNewHires = Object.values(gameState.employees).some(e =>
        e.hired && e.name !== 'Продакт менеджер'
      );
      if (hasNewHires) {
        setTimeout(() => endDay(), 500);
      }
    }
  }

  // День 2: завершаем, когда суммарная прибыль >= 0
  if (gameState.day === 2) {
    if (!dayEnded && !isInitialLoad && !hasShownEndScreen) {
      if (gameState.incomePerSecond >= 0) {
        setTimeout(() => endDay(), 500);
      }
    }
  }

  saveGame();
}


function tick() {
  // Прибыль команды идет в баланс компании, а не в бюджет команды
  gameState.balance += gameState.incomePerSecond;
  updateUI();
}

function upgrade(role) {
  const emp = gameState.employees[role];
  const price = calculateUpgradePrice(emp);

  if (gameState.teamBudget >= price) {
    gameState.teamBudget -= price;
    emp.level++;
    // Повышаем грейд каждые 3 уровня
    if (emp.level > 0 && emp.level % 3 === 0 && emp.grade < GRADES.length - 1) {
      emp.grade++;
    }
    recalcIncome();
    updateUI();
  } else alert('Недостаточно бюджета команды');
}


function generateCandidates(role) {
  candidates = [];
  candidateIndex = 0;

  const NUM = 5; // сколько кандидатов в листалке
  const MIN_PRICE = 5000;
  const MAX_PRICE = 35000;

  const MIN_PROFIT = -500;
  const MAX_PROFIT = 800;

  // 1) Уникальные имена (берём из списка, перемешанного)
  const namesPool = shuffleArray(CANDIDATE_NAMES);
  const avatarsPool = shuffleArray(CANDIDATE_AVATARS);

  // 2) Подготовим пул грейдов: постараемся сделать их уникальными,
  //    но если NUM > GRADES.length — равномерно распределим повторы.
  const gradeCount = GRADES.length;
  let gradePool = [];

  // сколько повторов каждого грейда минимум
  const baseRepeats = Math.floor(NUM / gradeCount);
  // сколько грейдов ещё нужно добавить
  let rem = NUM - baseRepeats * gradeCount;

  for (let gi = 0; gi < gradeCount; gi++) {
    for (let r = 0; r < baseRepeats; r++) gradePool.push(gi);
  }
  // добавим по одному для rem случайных грейдов (без повторов среди добавляемых если возможно)
  const gradeIndicesShuffled = shuffleArray(Array.from({length: gradeCount}, (_,i)=>i));
  for (let i = 0; i < rem; i++) {
    gradePool.push(gradeIndicesShuffled[i % gradeCount]);
  }
  // Перемешаем, чтобы грейды не шли по порядку
  gradePool = shuffleArray(gradePool);

  // 3) Для каждого кандидата генерируем цену из диапазона, привязанного к его грейду,
  //    и рассчитываем прибыль линейно от цены (с небольшой флуктуацией).
  const bucketSize = (MAX_PRICE - MIN_PRICE) / gradeCount;

  for (let i = 0; i < NUM; i++) {
    const name = namesPool[i % namesPool.length];
    const avatar = avatarsPool[i % avatarsPool.length];
    const gradeIndex = gradePool[i];

    // ценовой бакет, соответствующий грейду (чем выше грейд — выше диапазон цены)
    const bucketMin = Math.round(MIN_PRICE + bucketSize * gradeIndex);
    // даём небольшой запас, чтобы бакеты перекрывались немного
    const bucketMax = Math.round(bucketMin + bucketSize - 1);

    // безопасные границы
    const priceMin = Math.max(MIN_PRICE, bucketMin);
    const priceMax = Math.min(MAX_PRICE, bucketMax);

    // генерация цены внутри бакета (если бакет пуст — используем общий диапазон)
    let price = priceMin <= priceMax
      ? priceMin + Math.floor(Math.random() * (priceMax - priceMin + 1))
      : MIN_PRICE + Math.floor(Math.random() * (MAX_PRICE - MIN_PRICE + 1));

    // рассчитываем прибыль по цене (чем дороже — тем выше прибыль)
    let baseProfit = Math.floor(mapRange(price, MIN_PRICE, MAX_PRICE, MIN_PROFIT, MAX_PROFIT));

    // небольшая флуктуация ±50
    baseProfit += Math.floor(Math.random() * 101) - 50;

    // дополнительная защита логики: для дешёвых грейдов делаем прибыль чаще отрицательной
    if (gradeIndex === 0 && baseProfit > -20) {
      baseProfit = Math.min(baseProfit, -20);
    }

    candidates.push({
      name,
      avatar,
      gradeIndex,
      gradeText: GRADES[gradeIndex],
      baseProfit,
      price
    });
  

  // в конце можно ещё раз перемешать список, чтобы порядок был непредсказуем
  candidates = shuffleArray(candidates);
  candidateIndex = 0;
}
}

function openHire(role) {
  currentRole = role;
  generateCandidates(role);
  showCandidateInPanel();
  // Показываем листалку кандидатов внутри панели команды
  const candidateSelector = document.getElementById(`candidateSelector-${role}`);
  if (candidateSelector) {
    candidateSelector.classList.remove('hidden');
  }
}

function showCandidateInPanel() {
  if (!currentRole || candidates.length === 0) return;
  const c = candidates[candidateIndex];

  // Стартовый уровень, который мы даём при найме (согласован с логикой hireCurrent)
  const START_LEVEL = 1;
  const projectedProfit = c.baseProfit + START_LEVEL * PROFIT_PER_LEVEL;
  const profitText = projectedProfit >= 0 ? `+${formatNumber(projectedProfit)}` : formatNumber(projectedProfit);
  const priceText = `${formatNumber(c.price)}P`;

  const candidateInfo = document.getElementById(`candidateInfo-${currentRole}`);
  if (candidateInfo) {
    candidateInfo.innerHTML = `
      <div class="candidate-top">
        <div class="candidate-avatar">${c.avatar || '👤'}</div>
        <div class="candidate-meta">
          <div class="candidate-name">${c.name || 'Кандидат'}</div>
          <div class="candidate-grade grade-${c.gradeIndex}">${c.gradeText || ''}</div>
        </div>
      </div>

      <div class="candidate-info-content">
        <div class="candidate-stat">
          <span class="candidate-label">Прибыль при найме:</span>
          <span class="candidate-value ${projectedProfit >= 0 ? 'positive' : 'negative'}">${profitText}P/с</span>
        </div>
        <div class="candidate-stat">
          <span class="candidate-label">Цена:</span>
          <span class="candidate-value">
            <span class="coin-icon">🪙</span> ${priceText}
          </span>
        </div>
      </div>
    `;
  }
}



function nextCandidate(dir, role) {
  if (role) currentRole = role;
  if (candidates.length === 0) return;
  candidateIndex = (candidateIndex + dir + candidates.length) % candidates.length;
  showCandidateInPanel();
}

function hireCurrent(role) {
  if (role) currentRole = role;
  if (!currentRole) return;
  if (candidates.length === 0) return;

  const c = candidates[candidateIndex];
  if (gameState.teamBudget < c.price) {
    alert('Недостаточно бюджета команды');
    return;
  }

  const emp = gameState.employees[currentRole];
  // Сохраняем данные кандидата в карточке сотрудника
  emp.hired = true;
  emp.baseProfit = c.baseProfit; // базовая часть прибыли
  emp.basePrice = c.price;
  emp.level = 1; // стартовый уровень (с ним мы показывали проектируемую прибыль в листалке)
  emp.grade = c.gradeIndex; // грейд по кандидату
  // Сохраним отображаемые данные
  emp.avatar = c.avatar;
  emp.displayName = c.name;

  gameState.teamBudget -= c.price;

  recalcIncome();
  // Скрываем листалку кандидатов
  const candidateSelector = document.getElementById(`candidateSelector-${currentRole}`);
  if (candidateSelector) {
    candidateSelector.classList.add('hidden');
  }
  currentRole = null;
  updateUI();

  // Проверяем, завершен ли день (но только если это не начальная загрузка)
  if (gameState.day === 1 && hiredCount() >= TARGET_HIRES && !isInitialLoad && !hasShownEndScreen) {
    setTimeout(() => endDay(), 500);
  }
}


function transferToBudgetAmount(amount) {
  if (gameState.balance >= amount) {
    gameState.balance -= amount;
    gameState.teamBudget += amount;
    updateUI();
  } else {
    alert('Недостаточно средств на балансе компании');
  }
}


// Задачи первого дня
function checkDay1Tasks() {
  const tasks = {
    hireEmployees: hiredCount() >= TARGET_HIRES,
    notNegative: gameState.balance >= 0 && gameState.incomePerSecond >= 0, // И баланс, и прибыль должны быть неотрицательными
    goodMood: true // Пока всегда true, можно добавить логику позже
  };
  return tasks;
}

function endDay() {
  // Показываем экран результата только один раз и только если это не начальная загрузка
  if (!dayEnded && !isInitialLoad && !hasShownEndScreen) {
    dayEnded = true;
    hasShownEndScreen = true;

    // Подготовим модал в зависимости от дня
    const endScreen = document.getElementById('endDayScreen');
    if (!endScreen) return;

    const titleEl = endScreen.querySelector('.end-day-title');
    const tasksList = endScreen.querySelector('.tasks-list');

    // Разные тексты для 1 и 2 дня
    if (gameState.day === 1) {
      if (titleEl) titleEl.textContent = 'Ты выполнил задачу!';
      // оставляем статическую верстку, но обновим статусы через существующие id'шки
      // Обновляем статусы задач (по старой логике)
      const tasks = checkDay1Tasks();
      const financeTask = document.getElementById('financeTask');
      const moodTask = document.getElementById('moodTask');

      if (financeTask) {
        if (tasks.notNegative) {
          financeTask.classList.add('completed');
          financeTask.querySelector('.task-check').textContent = '✓';
        } else {
          financeTask.classList.remove('completed');
          financeTask.querySelector('.task-check').textContent = '✕';
        }
      }
      if (moodTask) {
        if (tasks.goodMood) {
          moodTask.classList.add('completed');
          moodTask.querySelector('.task-check').textContent = '✓';
        } else {
          moodTask.classList.remove('completed');
          moodTask.querySelector('.task-check').textContent = '✕';
        }
      }
    } else if (gameState.day === 2) {
      // Для второго дня — другой набор задач: выйти в неотрицательную прибыль
      if (titleEl) titleEl.textContent = 'Второй день завершён';
      // Перезапишем список задач в модалке под новый формат (1 задача — выйти в ноль, 2 — мораль/качество)
      tasksList.innerHTML = `
        <div class="task-item" id="financeTask">
          <span class="task-check">✕</span>
          <span class="task-text">Достичь суммарной прибыли ≥ 0</span>
        </div>
        <div class="task-item completed" id="moodTask">
          <span class="task-check">✓</span>
          <span class="task-text">Команда нанята и готова к улучшениям</span>
        </div>
      `;
      // Установим статус первой задачи по текущему доходу
      const financeTask = document.getElementById('financeTask');
      if (financeTask) {
        if (gameState.incomePerSecond >= 0) {
          financeTask.classList.add('completed');
          financeTask.querySelector('.task-check').textContent = '✓';
        } else {
          financeTask.classList.remove('completed');
          financeTask.querySelector('.task-check').textContent = '✕';
        }
      }
    } else {
      // Для будущих дней можно расширить логику
      if (titleEl) titleEl.textContent = 'День завершён';
    }

    // Показываем модал
    endScreen.classList.remove('hidden');
  }
}


// Функции для теста
// Вопросы для дня 1 (исходные)
const testQuestionsDay1 = [
  {
    question: 'Что такое «Бюджет»?',
    answers: [
      'План доходов и расходов на определённый период времени, используемый для управления финансовыми ресурсами организации',
      'Отчётный документ, который фиксирует фактические финансовые результаты компании за прошедший период',
      'Совокупность всех денежных средств, находящихся в распоряжении компании в текущий момент времени'
    ],
    correct: 0
  },
  {
    question: 'Команда Discovery...',
    answers: [
      'группа разработчиков, отвечающая за техническую реализацию и выпуск функциональности в продакшен',
      'кросс-функциональная продуктовая команда, которая исследует проблемы пользователей, проверяет гипотезы и определяет, какие решения стоит разрабатывать',
      'аналитическое подразделение, которое занимается сбором метрик после запуска продукта и оценкой его эффективности'
    ],
    correct: 1
  },
  {
    question: 'Что делает Продакт-менеджер?',
    answers: [
      'Создает визуальный облик продукта и интерфейсы',
      'Отвечает за ценность продукта, формулирует проблемы пользователей и координирует работу команды',
      'Привлекает пользователей к продукту через рекламные кампании'
    ],
    correct: 1
  }
];

// Новые вопросы для дня 2 — бизнес-процессы и метрики
const testQuestionsDay2 = [
  {
    question: 'Что такое KPI (Key Performance Indicator)?',
    answers: [
      'Конкретная метрика, показывающая, насколько эффективно достигаются бизнес-цели',
      'План развития продукта на квартал',
      'Список функций, которые разработчики должны реализовать'
    ],
    correct: 0
  },
  {
    question: 'Что означает метрика CAC (Customer Acquisition Cost)?',
    answers: [
      'Средняя стоимость удержания клиента в течение первого года',
      'Стоимость привлечения одного нового клиента',
      'Общая выручка от клиента за весь срок'
    ],
    correct: 1
  },
  {
    question: 'Что такое LTV (Customer Lifetime Value)?',
    answers: [
      'Среднее количество покупок на одного клиента в месяц',
      'Ожидаемая суммарная прибыль с одного клиента за всё время его взаимодействия с продуктом',
      'Время отклика сервера на пользовательский запрос'
    ],
    correct: 1
  }
];

// Текущий набор вопросов (по умолчанию — для дня 1)
let testQuestions = testQuestionsDay1;


let currentQuestion = 0;
let testScore = 0;

function startTest() {
  // Скрываем экран завершения дня (если открыт) и показываем тест
  document.getElementById('endDayScreen')?.classList.add('hidden');
  document.getElementById('testScreen')?.classList.remove('hidden');

  // Выбираем набор вопросов в зависимости от текущего дня
  if (gameState && gameState.day >= 2) {
    testQuestions = testQuestionsDay2;
  } else {
    testQuestions = testQuestionsDay1;
  }

  currentQuestion = 0;
  testScore = 0;
  showQuestion();
}


function showQuestion() {
  if (currentQuestion >= testQuestions.length) {
    showTestResult();
    return;
  }
  
  const q = testQuestions[currentQuestion];
  document.getElementById('questionNumber').textContent = `${currentQuestion + 1}/${testQuestions.length}`;
  document.getElementById('testQuestion').textContent = q.question;
  
  const answersList = document.getElementById('answersList');
  answersList.innerHTML = '';
  
  q.answers.forEach((answer, index) => {
    const answerDiv = document.createElement('div');
    answerDiv.className = 'answer-item';
    answerDiv.textContent = answer;
    answerDiv.onclick = () => selectAnswer(index);
    answersList.appendChild(answerDiv);
  });
}

function selectAnswer(index) {
  const q = testQuestions[currentQuestion];
  const answers = document.querySelectorAll('.answer-item');
  
  answers.forEach((answer, i) => {
    answer.classList.remove('selected', 'correct', 'wrong');
    if (i === q.correct) {
      answer.classList.add('correct');
    }
    if (i === index && i !== q.correct) {
      answer.classList.add('wrong');
    }
    if (i === index) {
      answer.classList.add('selected');
    }
  });
  
  if (index === q.correct) {
    testScore++;
  }
  
  setTimeout(() => {
    currentQuestion++;
    showQuestion();
  }, 1500);
}

function showTestResult() {
  // Скрываем экран с вопросами
  const testScreen = document.getElementById('testScreen');
  if (testScreen) testScreen.classList.add('hidden');

  // Обновляем счёт
  const scoreEl = document.getElementById('testScore');
  if (scoreEl) scoreEl.textContent = `${testScore}/${testQuestions.length}`;

  // Готовим экран результата
  const screen = document.getElementById('testResultScreen');
  if (!screen) return;

  const titleEl = screen.querySelector('.test-result-title');
  const primaryBtn = screen.querySelector('.btn-primary');
  const secondaryBtn = screen.querySelector('.btn-secondary');

  // Если это второй день или дальше — считаем игру пройденной
  if (gameState.day >= 2) {
    if (titleEl) titleEl.textContent = 'Игра пройдена';
    if (primaryBtn) {
      primaryBtn.textContent = 'В главное меню';
      // назначаем сброс прогресса и возврат в меню
      primaryBtn.onclick = function() {
        // resetGame должен существовать в game.js (см. ниже)
        if (typeof resetGame === 'function') {
          resetGame();
        } else {
          // если resetGame ещё не добавлен — просто показать меню и перезагрузить страницу
          showMainMenu();
          // опционально: принудительно очистить сохранение
          try { localStorage.removeItem('idleGame'); } catch (e) {}
          location.reload();
        }
      };
    }
    if (secondaryBtn) {
      // скрываем/деактивируем вторую кнопку (не нужна на финальном экране)
      secondaryBtn.style.display = 'none';
    }
  } else {
    // Поведение для первого дня — как раньше: заголовок + переход на следующий день
    if (titleEl) titleEl.textContent = 'Ты прошёл тест!';
    if (primaryBtn) {
      primaryBtn.textContent = 'Погнали во второй день';
      primaryBtn.onclick = goToNextDay;
    }
    if (secondaryBtn) {
      secondaryBtn.style.display = '';
      // если раньше была привязка — можно оставить (но ты просил убрать кнопки БЗ из тестов ранее)
    }
  }

  // Показываем экран результата
  screen.classList.remove('hidden');
}


function goToNextDay() {
  // Закрываем возможные экраны результатов/тестов
  const testResultScreen = document.getElementById('testResultScreen');
  if (testResultScreen) testResultScreen.classList.add('hidden');

  // Увеличиваем день, сохраняем флаги
  gameState.day++;
  dayEnded = false;
  hasShownEndScreen = false;

  // Останавливаем текущий тик (мы запустим его при старте следующего дня)
  if (tickIntervalId) {
    clearInterval(tickIntervalId);
    tickIntervalId = null;
  }
  gameRunning = false;
  // Показать экран с целями следующего дня — там игрок нажмёт "Начать день",
  // что вызовет prepareDay(gameState.day) и запустит тик.
  showDayIntro(gameState.day);

  // Сохраняем текущее состояние (день уже увеличен)
  saveGame();
  updateUI();
}



// Открывает отдельный экран Базы знаний (скрывает главное меню)
function openKnowledgeBase() {
  // Скрыть все модалки и меню
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  document.getElementById('mainMenu')?.classList.add('hidden');

  // Показать экран БЗ
  const screen = document.getElementById('knowledgeBaseScreen');
  if (screen) {
    screen.classList.remove('hidden');
  }

  // Заполнить таблицу данными (если есть)
  renderKnowledgeBase();
}

function closeKnowledgeBase() {
  const screen = document.getElementById('knowledgeBaseScreen');
  if (screen) screen.classList.add('hidden');

  // Вернуть главное меню (если пользователь пришёл из меню)
  document.getElementById('mainMenu')?.classList.remove('hidden');
}

// Рендер таблицы БЗ. Ожидает данные в window.KB_ENTRIES (массив объектов {term, def, why}).
// Если данных нет — рисует заглушку.
function renderKnowledgeBase() {
  const body = document.getElementById('kbTableBody');
  if (!body) return;
  body.innerHTML = '';

  const entries = Array.isArray(window.KB_ENTRIES) ? window.KB_ENTRIES : [
    { term: 'Бюджет', def: 'План доходов и расходов на определённый период времени.', why: 'Помогает управлять финансами и планировать траты.' },
    { term: 'Discovery', def: 'Процесс исследования проблем пользователей и проверки гипотез.', why: 'Позволяет понять, что нужно пользователю до разработки.' }
  ];

  entries.forEach(e => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="padding:8px; border-bottom:1px solid #f4f4f4;">${e.term || ''}</td>
      <td style="padding:8px; border-bottom:1px solid #f4f4f4;">${e.def || ''}</td>
      <td style="padding:8px; border-bottom:1px solid #f4f4f4;">${e.why || ''}</td>
    `;
    body.appendChild(tr);
  });
}

function openTeamPanel() {
  const panel = document.querySelector('.team-panel');
  if (panel) {
    panel.style.display = 'block';
    // Обновляем UI при открытии панели
    updateUI();
  }
}

function closePanel() {
  const panel = document.querySelector('.team-panel');
  if (panel) {
    panel.style.display = 'none';
  }
}

// Добавляем обработчики
document.addEventListener('DOMContentLoaded', function() {
  showMainMenu();
  document.querySelectorAll('.team-circle').forEach(circle => {
    circle.addEventListener('click', (e) => {
      // открываем панель команды (твоя функция)
      openTeamPanel();
      // сообщаем онбордингу что панель открыта (если он этого ждал)
      onTeamPanelOpen();
    });
  });
document.getElementById('startGameBtn').addEventListener('click', () => {
  startGameFromMenu();
});

  const closeBtn = document.querySelector('.close-panel-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', closePanel);
  }
  const pauseBtn = document.querySelector('.pause-btn');
  if (pauseBtn) {
    pauseBtn.addEventListener('click', (e) => {
      togglePause();
    });
    // Установим начальную иконку в соответствии с состоянием isPaused
    pauseBtn.textContent = isPaused ? '▶' : '⏸';
  }

  
  // Клик на оранжевый круг открывает панель команды
  const orangeCircle = document.querySelector('.team-circle.orange');
  if (orangeCircle) {
    orangeCircle.addEventListener('click', openTeamPanel);
  }
});

function startGame() {
  loadGame();
  recalcIncome();

  // При начальной загрузке не показываем экран завершения сразу
  isInitialLoad = true;
  hasShownEndScreen = false;

  // Если в сохранении уже был пройден первый день — можно показать интро следующего.
  // В любом случае показываем интро для текущего дня.
  showDayIntro(gameState.day);

  // Не запускаем тик до нажатия "Начать день" в интро.
  // Если хочешь авто-старт, можно добавить проверку флага в сохранении.

  updateUI();
}
// ========== ЭНЕРГИЯ и мини-викторина ==========

const ENERGY_MAX = 5;
let playerEnergy = ENERGY_MAX; // старт
let energyQuestionActive = false; // флаг, когда показывается вопрос (прибыль заморожена)
let currentEnergyQuestion = null;

// Инициализация UI энергии
function initEnergy() {
  const recoverBtn = document.getElementById('energyRecoverBtn');
  if (recoverBtn) {
    recoverBtn.addEventListener('click', () => {
      // нельзя восстанавливать, если уже полный запас
      if (playerEnergy >= ENERGY_MAX) return;
      // показываем модал с вопросом и замораживаем прибыль
      openEnergyQuestion();
    });
  }
  renderEnergy();
}

// Отрисовка кружков энергии
// Отрисовка кружков энергии — теперь добавляем data-index для каждой точки
function renderEnergy() {
  const container = document.getElementById('energyDots');
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < ENERGY_MAX; i++) {
    const dot = document.createElement('div');
    dot.className = 'energy-dot' + (i < playerEnergy ? ' full' : '');
    dot.dataset.index = i;
    container.appendChild(dot);
  }
}


// Показать модал с вопросом
function openEnergyQuestion() {
  if (!window.QUIZ_QUESTIONS || !Array.isArray(window.QUIZ_QUESTIONS)) {
    alert('Вопросы недоступны');
    return;
  }
  // берём случайный вопрос
  currentEnergyQuestion = window.QUIZ_QUESTIONS[Math.floor(Math.random() * window.QUIZ_QUESTIONS.length)];
  const modal = document.getElementById('energyQuestionModal');
  const text = document.getElementById('energyQText');
  const answers = document.getElementById('energyQAnswers');
  if (!modal || !text || !answers) return;

  text.textContent = currentEnergyQuestion.question;
  answers.innerHTML = '';
  currentEnergyQuestion.answers.forEach((a, idx) => {
    const btn = document.createElement('button');
    btn.className = 'answerEnergy-item';
    btn.style.display = 'block';
    btn.style.width = '100%';
    btn.style.marginBottom = '8px';
    btn.textContent = a;
    btn.onclick = () => selectEnergyAnswer(idx);
    answers.appendChild(btn);
  });

  // замораживаем прибыль (tick будет проверять флаг)
  energyQuestionActive = true;
  modal.classList.remove('hidden');
  UpdateUI(true);
}

// Закрыть hint
function closeEnergyHint() {
  const m = document.getElementById('energyHintModal');
  if (m) m.classList.add('hidden');
}

// Обработка ответа на вопрос
function selectEnergyAnswer(idx) {
  const modal = document.getElementById('energyQuestionModal');
  if (!currentEnergyQuestion) return;
  const correct = (idx === currentEnergyQuestion.correct);

  // Если ответ верный — сначала увеличиваем запас (логика), затем рендерим и анимируем новую точку
  if (correct) {
    const prev = playerEnergy;
    playerEnergy = Math.min(ENERGY_MAX, playerEnergy + 1);

    // Рендерим обновлённые точки
    renderEnergy();

    // Анимируем только что добавленную точку (индекс playerEnergy-1)
    const container = document.getElementById('energyDots');
    if (container) {
      const dots = container.querySelectorAll('.energy-dot');
      const idxNew = playerEnergy - 1;
      if (idxNew >= 0 && dots[idxNew]) {
        const newDot = dots[idxNew];
        // Помечаем анимацией восстановления
        newDot.classList.add('recover');
        // Удаляем класс анимации после завершения, чтобы можно было проиграть снова позже
        newDot.addEventListener('animationend', function onEnd() {
          newDot.removeEventListener('animationend', onEnd);
          newDot.classList.remove('recover');
          // явно оставляем класс full (renderEnergy уже поставил)
        });
      }
    }
  }

  // закрываем модал и размораживаем прибыль
  energyQuestionActive = false;
  currentEnergyQuestion = null;
  if (modal) modal.classList.add('hidden');

  // Обновляем UI (выполнится безопасно через обёрнутый updateUI)
  updateUI();
}


// Закрытие модалки через кнопку "Отмена"
const energyQCloseBtn = document.getElementById && document.getElementById('energyQClose');
if (energyQCloseBtn) {
  energyQCloseBtn.addEventListener('click', () => {
    energyQuestionActive = false;
    const modal = document.getElementById('energyQuestionModal');
    if (modal) modal.classList.add('hidden');
    UpdateUI(true);
  });
}

// Модификация tick: если energyQuestionActive — не изменяем баланс
const originalTick = typeof tick === 'function' ? tick : null;
function tick_with_energy() {
  if (energyQuestionActive) {
    // пока модал открыт — не начисляем/не снимаем прибыль, но всё равно обновляем UI
    UpdateUI();
    return;
  }
  // иначе обычный тик (если originalTick определён)
  if (originalTick) originalTick();
}
// Если tick уже была объявлена, переопределяем setInterval вызовы на новую функцию.
// Но проще: переопределим глобальную функцию tick так, чтобы работала и раньше.
if (typeof tick === 'function') {
  // заменяем tick в глобальном скоупе
  window._old_tick = tick;
  window.tick = function() {
    if (isPaused || energyQuestionActive) {
      UpdateUI();
      return;
    }
    window._old_tick();
  };
}

// Перехват кликов для снижения энергии при действиях с сотрудниками
// Мы используем capture-phase listener, чтобы сработать до inline onclick
// Перехват кликов (capture) — запускаем анимацию тратя энергию прежде, чем выполнится onclick
document.addEventListener('click', function (e) {
  // Если вопрос открыт — блокируем действия вне модалки
  if (energyQuestionActive) {
    if (e.target.closest && e.target.closest('#energyQuestionModal')) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    return;
  }

  const actionSelectors = [
    '.employee .hire-btn',
    '.employee .upgrade-btn',
    '.employee .select-candidate-btn',
  ];

  // ищем ближайший подходящий элемент в дереве
  let el = e.target;
  while (el && el !== document) {
    for (const sel of actionSelectors) {
      if (el.matches && el.matches(sel)) {
        // Нашли действие, обрабатываем энергию:
        if (playerEnergy > 0) {
          // Анимируем трату последней заполненной точки, затем уменьшаем и даём шанс выполнить исходное действие.
          const container = document.getElementById('energyDots');
          if (!container) {
            // Бэкап: просто уменьшить и продолжить
            playerEnergy = Math.max(0, playerEnergy - 1);
            renderEnergy();
            return;
          }
          // Находим последнюю полную точку
          const fullDots = Array.from(container.querySelectorAll('.energy-dot.full'));
          const lastDot = fullDots.length ? fullDots[fullDots.length - 1] : null;

          if (lastDot) {
            // Добавляем класс spend и подождём конца анимации, затем уменьшаем энергию и обновим UI.
            lastDot.classList.add('spend');
            lastDot.addEventListener('animationend', function onEnd() {
              lastDot.removeEventListener('animationend', onEnd);
              // Уменьшаем энергию и перерисуем
              playerEnergy = Math.max(0, playerEnergy - 1);
              renderEnergy();
              // После анимации — даём браузеру продолжить обработку клика: ничего дополнительно не делаем,
              // потому что мы работаем в capture-phase; действие всё ещё будет выполнено (onclick на target).
            });
          } else {
            // Если вдруг точки не найдены — действуем без анимации
            playerEnergy = Math.max(0, playerEnergy - 1);
            renderEnergy();
          }
        } else {
          // Нет энергии — блокируем действие и показываем подсказку
          e.stopImmediatePropagation();
          e.preventDefault();
          const hint = document.getElementById('energyHintModal');
          if (hint) hint.classList.remove('hidden');
          else alert('У вас нет энергии. Нажмите + чтобы восстановить.');
        }
        return; // обработка закончена
      }
    }
    el = el.parentNode;
  }
}, true);
 // capture = true — чтобы сработать до inline onclick

// Инициализация — вызывать при старте игры
(function () {
  // Если initEnergy вызывается раньше чем DOM готов, завернуть
  document.addEventListener('DOMContentLoaded', initEnergy);
  // если game.js вызывает startGame() сразу, лучше инициализировать прямо:
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initEnergy();
  }
})();


// ================== ONBOARDING ==================
// ========== Контекстный онбординг (заменяет старую реализацию) ==========

// ========== Контекстный онбординг (обновлённый) ==========
let onboardingStep = 0;
let onboardingWaitingForTeamOpen = false;

function startOnboarding() {
  // замораживаем игровой тик (прибыль не идёт)
  gameRunning = false;
  isPaused = true;
  onboardingStep = 0;
  // Показываем overlay и запускаем шаги
  showOnboardingStep();
}

function showOnboardingStep() {
  const steps = [
    {
      text: "Это нижняя панель: здесь показывается баланс компании, бюджет команды и текущая прибыль. Отсюда можно быстро видеть финансовое состояние.",
      selector: ".bottom-bar",
      position: "above",
      waitForAction: false,
      nextLabel: "Понял"
    },
    {
      text: "Эти иконки — команда. Нажми на оранжевый круг, чтобы открыть панель команды и посмотреть бюджет и сотрудников.",
      selector: ".team-circle.orange",
      position: "side",
      waitForAction: true,
      nextLabel: null
    },
    {
      text: "Это панель команды: здесь видно бюджет команды, суммарную прибыль и список сотрудников. Отсюда можно переводить деньги в бюджет и нанимать/улучшать людей.",
      selector: ".team-panel",
      position: "side",
      waitForAction: false,
      nextLabel: "Погнали нанимать!"
    }
  ];

  const step = steps[onboardingStep];
  const overlay = document.getElementById("onboardingOverlay");
  const tooltip = overlay.querySelector(".onboarding-tooltip");
  const textEl = document.getElementById("onboardingText");
  const nextBtn = document.getElementById("onboardingNextBtn");

  if (!overlay || !tooltip || !textEl || !nextBtn) {
    console.warn("Onboarding elements not found in DOM");
    return;
  }

  // Показываем overlay (он будет служить только контейнером для тултипа)
  overlay.classList.remove("hidden");
  // убираем фон overlay — маску рисуем отдельным элементом
  overlay.style.background = 'transparent';
  // делаем сам overlay не блокирующим клики, тултип сделаем интерактивным
  overlay.style.pointerEvents = 'none';
  tooltip.style.pointerEvents = 'auto';
  tooltip.style.zIndex = 1003;

  // текст тултипа
  textEl.textContent = step.text;

  // кнопка
  if (step.nextLabel) {
    nextBtn.style.display = "inline-block";
    nextBtn.textContent = step.nextLabel;
    nextBtn.onclick = () => {
      onboardingStep++;
      if (onboardingStep >= steps.length) {
        endOnboarding();
      } else {
        showOnboardingStep();
      }
    };
  } else {
    nextBtn.style.display = "none";
  }

  // удаляем старое выделение
  const old = document.querySelector(".onboarding-highlight");
  if (old) old.remove();

  // Позиционируем выделение вокруг target
  const target = document.querySelector(step.selector);
  if (target) {
    const rect = target.getBoundingClientRect();
    const highlight = document.createElement("div");
    highlight.className = "onboarding-highlight";
    document.body.appendChild(highlight);

    const pad = 10;
    highlight.style.top = (rect.top - pad) + "px";
    highlight.style.left = (rect.left - pad) + "px";
    highlight.style.width = (rect.width + pad*2) + "px";
    highlight.style.height = (rect.height + pad*2) + "px";
    // Маска делается через большой box-shadow (тёмная область вокруг),
    // при этом highlight находится над тёмным фоном — сам элемент остаётся светлым.
    highlight.style.boxShadow = "0 0 0 9999px rgba(0,0,0,0.6)";
    highlight.style.pointerEvents = "none";
    highlight.style.zIndex = 1002;
    highlight.style.borderRadius = "10px";

    // Показываем тултип и позиционируем его в зависимости от desired position
    tooltip.classList.remove("show");
    setTimeout(() => tooltip.classList.add("show"), 30);

    // Получаем размеры тултипа (после добавления класса show)
    const tooltipRect = tooltip.getBoundingClientRect();

    // позиционирование: above, below, side (right preferred, fallback left)
    if (step.position === "above") {
      const top = rect.top - tooltipRect.height - 12;
      tooltip.style.position = "absolute";
      tooltip.style.top = Math.max(12, top) + "px";
      tooltip.style.left = Math.min(window.innerWidth - tooltipRect.width - 12, Math.max(12, rect.left + rect.width/2 - tooltipRect.width/2)) + "px";
    } else if (step.position === "below") {
      tooltip.style.position = "absolute";
      tooltip.style.top = Math.min(window.innerHeight - tooltipRect.height - 12, rect.bottom + 12) + "px";
      tooltip.style.left = Math.min(window.innerWidth - tooltipRect.width - 12, Math.max(12, rect.left + rect.width/2 - tooltipRect.width/2)) + "px";
    } else { // side
      // пытаемся справа
      const spaceRight = window.innerWidth - rect.right;
      const spaceLeft = rect.left;
      tooltip.style.position = "absolute";
      if (spaceRight > tooltipRect.width + 24) {
        // справа
        tooltip.style.left = (rect.right + 12) + "px";
        tooltip.style.top = Math.max(12, rect.top + Math.min(0, rect.height/2 - tooltipRect.height/2)) + "px";
      } else if (spaceLeft > tooltipRect.width + 24) {
        // слева
        tooltip.style.left = Math.max(12, rect.left - tooltipRect.width - 12) + "px";
        tooltip.style.top = Math.max(12, rect.top + Math.min(0, rect.height/2 - tooltipRect.height/2)) + "px";
      } else {
        // fallback — сверху
        const top = rect.top - tooltipRect.height - 12;
        tooltip.style.top = Math.max(12, top) + "px";
        tooltip.style.left = Math.min(window.innerWidth - tooltipRect.width - 12, Math.max(12, rect.left + rect.width/2 - tooltipRect.width/2)) + "px";
      }
    }

    // если шаг ждёт действия — выставляем флаг ожидания
    if (step.waitForAction) {
      onboardingWaitingForTeamOpen = true;
    } else {
      onboardingWaitingForTeamOpen = false;
    }
  } else {
    // target не найден — показываем тултип снизу центра (без выделения)
    tooltip.style.position = "fixed";
    tooltip.style.left = "50%";
    tooltip.style.transform = "translateX(-50%)";
    tooltip.style.bottom = "20px";
    onboardingWaitingForTeamOpen = false;
  }
}

function onTeamPanelOpen() {
  // Вызывается, когда игрок открыл панель команды (обычно по клику на .team-circle)
  if (!onboardingWaitingForTeamOpen) return;
  onboardingWaitingForTeamOpen = false;
  onboardingStep++;
  showOnboardingStep();
}

function endOnboarding() {
  const overlay = document.getElementById("onboardingOverlay");
  if (overlay) {
    overlay.classList.add("hidden");
    overlay.style.background = '';
    overlay.style.pointerEvents = '';
  }
  const old = document.querySelector(".onboarding-highlight");
  if (old) old.remove();

  // Снимаем паузу и запускаем игру
  isPaused = false;
  gameRunning = true;
  // Если тик ещё не запущен — запустим
  if (!tickIntervalId) {
    tickIntervalId = setInterval(window.tick, 1000);
  }
  updateUI();
}






function rollbackDay() {
  if (confirm("Ты уверен, что хочешь сбросить весь прогресс и вернуться к самому началу?")) {
    // 1. Возвращаем gameState к дефолтным значениям
    gameState = {
      balance: 100000, 
      teamBudget: 50000, 
      incomePerSecond: -356, 
      day: 1,
employees: {
    pm: { 
      name: 'Продакт менеджер', 
      level: 0, 
      grade: 0, // 0 = Junior
      hired: true, // Уже нанят изначально
      baseProfit: -356, 
      basePrice: 10000, 
      desc: 'Продакт-менеджер — специалист, отвечающий за ценность продукта. Он формулирует проблему пользователя, определяет цели продукта, приоритизирует задачи и координирует работу команды для достижения бизнес-результатов. Продакт-менеджер связывает бизнес-цели с техническими возможностями и следит за тем, чтобы продукт решал реальные проблемы пользователей.' 
    },
    designer: { 
      name: 'Дизайнер', 
      level: 0, 
      grade: 0,
      hired: false, 
      baseProfit: -200, 
      basePrice: 8000, 
      desc: 'Дизайнер создает визуальный облик продукта: интерфейсы, иконки, анимации. Он продумывает пользовательский опыт (UX) и делает продукт удобным и красивым. Хороший дизайн повышает конверсию и удовлетворенность пользователей. Дизайнер работает в тесной связке с продакт-менеджером и разработчиками, чтобы создать продукт, который не только выглядит хорошо, но и работает интуитивно.' 
    },
    analyst: { 
      name: 'Аналитик', 
      level: 0, 
      grade: 0,
      hired: false, 
      baseProfit: -150, 
      basePrice: 9000, 
      desc: 'Аналитик собирает и анализирует данные о продукте: метрики использования, поведение пользователей, конверсии. Он помогает принимать решения на основе данных и находить точки роста продукта. Аналитик работает с инструментами аналитики, проводит A/B тесты и помогает команде понять, какие функции продукта действительно нужны пользователям, а какие можно улучшить или убрать.' 
    },
    marketer: { 
      name: 'Маркетолог', 
      level: 0, 
      grade: 0,
      hired: false, 
      baseProfit: -100, 
      basePrice: 7000, 
      desc: 'Маркетолог привлекает пользователей к продукту: создает рекламные кампании, работает с контентом, анализирует каналы привлечения. Он помогает продукту найти свою аудиторию и увеличить количество пользователей. Маркетолог определяет целевую аудиторию, выбирает каналы продвижения и измеряет эффективность маркетинговых активностей, чтобы привлекать пользователей с наименьшими затратами.' 
    },
  }
    };

    // 2. Сбрасываем системные флаги
    dayEnded = false;
    hasShownEndScreen = false;
    currentRole = null;
     // Закрываем выбор кандидата, если был открыт

    // 3. Сохраняем "пустое" состояние в память браузера
    saveGame();
    localStorage.removeItem("onboardingDone");

    // 4. Обновляем экран
    recalcIncome();
    updateUI();
    
    // 5. Закрываем все открытые окна (панели и модалки)
    const panel = document.querySelector('.team-panel');
    if (panel) panel.style.display = 'none';
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));

    alert("Игра сброшена до начального состояния!");
  }
}
function resetGame() {
  // Остановим тик
  if (tickIntervalId) {
    clearInterval(tickIntervalId);
    tickIntervalId = null;
  }
  gameRunning = false;
  isPaused = false;
  dayEnded = false;
  hasShownEndScreen = false;
  currentRole = null;
  isInitialLoad = true;

  // Сбрасываем состояние игры (валидно для твоего текущего формата gameState)
  gameState = {
    balance: 100000,
    teamBudget: 50000,
    incomePerSecond: -356,
    day: 1,
    employees: {
      pm: { 
        name: 'Продакт менеджер', 
        level: 0, 
        grade: 0,
        hired: true,
        baseProfit: -356,
        basePrice: 10000,
        desc: 'Продакт-менеджер — специалист, отвечающий за ценность продукта...'
      },
      designer: { name: 'Дизайнер', level: 0, grade: 0, hired: false, baseProfit: -200, basePrice: 8000, desc: '...' },
      analyst: { name: 'Аналитик', level: 0, grade: 0, hired: false, baseProfit: -150, basePrice: 9000, desc: '...' },
      marketer: { name: 'Маркетолог', level: 0, grade: 0, hired: false, baseProfit: -100, basePrice: 7000, desc: '...' }
    }
  };

  // Очистить сохранение и пересчитать
  try { localStorage.removeItem('idleGame'); } catch (e) {}
  saveGame();
  recalcIncome();
  updateUI();

  // Закрыть модалки и показать меню
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  showMainMenu();

  // Сброс энергии
  playerEnergy = ENERGY_MAX;
  energyQuestionActive = false;
  currentEnergyQuestion = null;
  renderEnergy();
}

startGame();
