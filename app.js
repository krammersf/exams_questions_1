// Importar Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, push } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDERCoKXi7qa1k4S5pc0JipHyFEjgqwXAg",
  authDomain: "examtopics-v1.firebaseapp.com",
  databaseURL: "https://examtopics-v1-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "examtopics-v1",
  storageBucket: "examtopics-v1.appspot.com",
  messagingSenderId: "596894003766",
  appId: "1:596894003766:web:9c310b67a78b46b97c5e97"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Variáveis globais
let subopcoesPorSistema = [];
let selectedProvider = '';
let selectedExamValue = '';
let selectedExamLabel = '';

async function carregarSubopcoes() {
  try {
    const response = await fetch('subopcoes.json');
    if (!response.ok) throw new Error('Erro a carregar JSON');
    subopcoesPorSistema = await response.json();
    popularProvidersDropdown();
  } catch (e) {
    console.error(e);
    subopcoesPorSistema = [];
  }
}

function popularProvidersDropdown() {
  const optionsContainer = document.getElementById('providerOptions');
  const display = document.getElementById('providerDisplay');
  const hiddenInput = document.getElementById('sistema');

  optionsContainer.innerHTML = '';
  display.textContent = '-- Choose a option --';
  hiddenInput.value = '';
  selectedProvider = '';

  subopcoesPorSistema.forEach(item => {
    const div = document.createElement('div');
    div.className = 'select-option';
    div.textContent = item.provider;
    div.dataset.value = item.provider;

    div.addEventListener('click', () => {
      selectedProvider = item.provider;
      hiddenInput.value = item.provider;
      display.textContent = div.textContent;
      optionsContainer.style.display = 'none';
      popularExamsDropdown(item.exams);
    });

    optionsContainer.appendChild(div);
  });

  display.onclick = () => {
    optionsContainer.style.display = optionsContainer.style.display === 'block' ? 'none' : 'block';
  };

  document.addEventListener('click', (e) => {
    if (!document.getElementById('customProvider').contains(e.target)) {
      optionsContainer.style.display = 'none';
    }
  });
}

function popularExamsDropdown(exams) {
  const optionsContainer = document.getElementById('selectOptions');
  const display = document.getElementById('selectDisplay');
  const hiddenInput = document.getElementById('subopcao');

  optionsContainer.innerHTML = '';
  display.textContent = '-- Choose an option --';
  hiddenInput.value = '';
  selectedExamValue = '';
  selectedExamLabel = '';

  exams.forEach(exam => {
    const div = document.createElement('div');
    div.className = 'select-option';
    const [code, desc] = exam.label.split(': ');
    div.innerHTML = `<strong>${code}</strong>${desc ? `<br><span>${desc}</span>` : ''}`;
    div.dataset.value = exam.value;
    div.dataset.label = exam.label;

    div.addEventListener('click', () => {
      selectedExamValue = exam.value;
      selectedExamLabel = exam.label;
      hiddenInput.value = exam.value;
      display.textContent = code;
      optionsContainer.style.display = 'none';
      const questionsLine = document.getElementById('infoQuestions');
      if (questionsLine) {
        questionsLine.textContent = `This exam has ${exam.questions} questions.`;
      }
    });

    optionsContainer.appendChild(div);
  });

  display.onclick = () => {
    optionsContainer.style.display = optionsContainer.style.display === 'block' ? 'none' : 'block';
  };

  document.addEventListener('click', (e) => {
    if (!document.getElementById('customSelect').contains(e.target)) {
      optionsContainer.style.display = 'none';
    }
  });
}

window.validarFormulario = function() {
  const sistema = document.getElementById('sistema').value;
  const subopcao = document.getElementById('subopcao').value;
  const email = document.getElementById('email').value.trim();
  const erroEmail = document.getElementById('erroEmail');

  if (!sistema) {
    alert('Please select a provider.');
    return false;
  }

  if (!subopcao) {
    alert('Please select an exam.');
    return false;
  }

  const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regexEmail.test(email)) {
    erroEmail.textContent = 'Please enter a valid email.';
    return false;
  }
  erroEmail.textContent = '';

  // Preencher dados no modal de confirmação
  document.getElementById('confSistema').textContent = sistema;
  document.getElementById('confSubopcao').textContent = selectedExamLabel;
  document.getElementById('confEmail').textContent = email;
  document.getElementById('confSubopcao').dataset.value = subopcao;

  const numQuestions = getQuestionsByValue(sistema, subopcao);
  document.getElementById('confQuestions').textContent = `${numQuestions}`;

  const descriptionText = `${selectedExamValue} ${email}`;
  document.getElementById('paymentDescription').textContent = descriptionText;

  // Agora mostra o modal de CONFIRMAÇÃO (não pagamento já)
  document.getElementById('modalFundo').style.display = 'flex';

  return false;
};

function getQuestionsByValue(provider, value) {
  const providerData = subopcoesPorSistema.find(p => p.provider === provider);
  if (!providerData) return 0;
  const exam = providerData.exams.find(e => e.value === value);
  return exam ? exam.questions : 0;
}

document.addEventListener('DOMContentLoaded', () => {
  carregarSubopcoes();

  // Ao clicar "Sim" na confirmação
  document.getElementById('btnSim').addEventListener('click', e => {
    e.preventDefault();

    // Fecha confirmação, abre pagamento
    document.getElementById('modalFundo').style.display = 'none';
    document.getElementById('modalPagamento').style.display = 'flex';
  });

  // Ao clicar "Continuar" após pagamento
  document.getElementById('btnContinue').addEventListener('click', async () => {
    const sistema = document.getElementById('confSistema').textContent;
    const subopcao = document.getElementById('confSubopcao').dataset.value;
    const email = document.getElementById('confEmail').textContent;

    try {
      await push(ref(db, "respostas"), {
        sistema,
        subopcao,
        email,
        timestamp: new Date().toISOString()
      });

      document.getElementById('modalPagamento').style.display = 'none';
      document.getElementById('modalSucesso').style.display = 'flex';

    } catch (err) {
      alert('Erro ao enviar: ' + err.message);
    }
  });

  document.getElementById('btnNao').addEventListener('click', e => {
    e.preventDefault();
    document.getElementById('modalFundo').style.display = 'none';
  });

  document.getElementById('btnOkSucesso').addEventListener('click', () => {
    document.getElementById('modalSucesso').style.display = 'none';

    document.getElementById('sistema').value = '';
    document.getElementById('subopcao').value = '';
    document.getElementById('email').value = '';
    document.getElementById('erroEmail').textContent = '';
    document.getElementById('infoQuestions').textContent = '';
    document.getElementById('providerDisplay').textContent = '-- Choose a option --';
    document.getElementById('selectDisplay').textContent = '-- Choose an option --';
    selectedProvider = '';
    selectedExamValue = '';
    selectedExamLabel = '';
    document.getElementById('providerOptions').innerHTML = '';
    document.getElementById('selectOptions').innerHTML = '';
    popularProvidersDropdown();
  });

  document.getElementById('btnClear').addEventListener('click', () => {
    document.getElementById('sistema').value = '';
    document.getElementById('subopcao').value = '';
    document.getElementById('email').value = '';
    document.getElementById('erroEmail').textContent = '';
    document.getElementById('infoQuestions').textContent = '';
    document.getElementById('providerDisplay').textContent = '-- Choose a option --';
    document.getElementById('selectDisplay').textContent = '-- Choose an option --';
    selectedProvider = '';
    selectedExamValue = '';
    selectedExamLabel = '';
    document.getElementById('providerOptions').innerHTML = '';
    document.getElementById('selectOptions').innerHTML = '';
    popularProvidersDropdown();
  });
});