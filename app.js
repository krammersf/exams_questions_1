// Importar Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, push } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDERCoKXi7qa1k4S5pc0JipHyFEjgqwXAg",
  authDomain: "examtopics-v1.firebaseapp.com",
  databaseURL: "https://examtopics-v1-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "examtopics-v1",
  storageBucket: "examtopics-v1.firebasestorage.app",
  messagingSenderId: "596894003766",
  appId: "1:596894003766:web:9c310b67a78b46b97c5e97"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Variável global para armazenar as subopções
let subopcoesPorSistema = {};
let selectedValue = '';
let selectedLabel = '';

// Função para carregar as subopções do ficheiro JSON
async function carregarSubopcoes() {
  try {
    const response = await fetch('subopcoes.json');
    if (!response.ok) {
      throw new Error('Erro ao carregar subopcoes.json');
    }
    subopcoesPorSistema = await response.json();
    console.log('Subopções carregadas:', subopcoesPorSistema);
  } catch (error) {
    console.error('Erro ao carregar subopções:', error);
    // Fallback com dados básicos se o JSON não carregar
    subopcoesPorSistema = {
      "servicenow": [
        { "label": "CAD: ServiceNow Certified Application Developer Popular", "value": "cad" },
        { "label": "CIS-CSM: Certified Implementation Specialist - Customer Service Management Popular", "value": "cis-csm" }
      ]
    };
  }
}

// Função para inicializar o dropdown customizado
function initCustomSelect() {
  const selectDisplay = document.getElementById('selectDisplay');
  const selectOptions = document.getElementById('selectOptions');
  const hiddenInput = document.getElementById('subopcao');

  // Toggle dropdown
  selectDisplay.addEventListener('click', () => {
    const isVisible = selectOptions.style.display === 'block';
    selectOptions.style.display = isVisible ? 'none' : 'block';
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!document.getElementById('customSelect').contains(e.target)) {
      selectOptions.style.display = 'none';
    }
  });
}

// Função para popular o dropdown customizado
function popularDropdown(opcoes) {
  const selectOptions = document.getElementById('selectOptions');
  const selectDisplay = document.getElementById('selectDisplay');
  const hiddenInput = document.getElementById('subopcao');

  // Limpar opções existentes
  selectOptions.innerHTML = '';
  selectDisplay.textContent = '-- Escolha o exame --';
  selectedValue = '';
  selectedLabel = '';
  hiddenInput.value = '';

  opcoes.forEach(opcao => {
    const optionDiv = document.createElement('div');
    optionDiv.className = 'select-option';
    optionDiv.dataset.value = opcao.value;

    // Dividir o label em código e descrição
    const [codigo, descricao] = opcao.label.split(': ');
    
    optionDiv.innerHTML = `
      <div style="display: flex; flex-direction: column;">
        <span style="font-weight: bold; color: #333; font-size: 14px;">${codigo}</span>
        <span style="color: #666; font-size: 12px;">${descricao || ''}</span>
      </div>
    `;

    // Adicionar evento de clique
    optionDiv.addEventListener('click', () => {
      selectedValue = opcao.value;
      selectedLabel = opcao.label;

      // Atualizar display principal
      selectDisplay.innerHTML = optionDiv.innerHTML;

      // Guardar no input escondido
      hiddenInput.value = opcao.value;

      // Fechar dropdown
      selectOptions.style.display = 'none';

      console.log('Selecionado:', selectedValue, selectedLabel);
    });

    selectOptions.appendChild(optionDiv);
  });
}

// Função para atualizar subopções (chamada quando muda o provider)
window.atualizarSubopcoes = function () {
  const sistemaSelecionado = document.getElementById("sistema").value;
  const selectDisplay = document.getElementById('selectDisplay');
  
  if (sistemaSelecionado && subopcoesPorSistema[sistemaSelecionado]) {
    // Mostrar loading
    selectDisplay.textContent = '-- Loading... --';
    
    // Pequeno delay para mostrar o loading
    setTimeout(() => {
      popularDropdown(subopcoesPorSistema[sistemaSelecionado]);
    }, 200);
  } else {
    // Limpar se não há sistema selecionado
    popularDropdown([]);
  }
};

// Função para validar formulário
window.validarFormulario = function () {
  const sistema = document.getElementById("sistema").value;
  const email = document.getElementById("email").value.trim();
  const erroEmail = document.getElementById("erroEmail");

  // Validar se tem sistema selecionado
  if (!sistema) {
    alert("Please select a provider.");
    return false;
  }

  // Validar se tem exame selecionado
  if (!selectedValue) {
    alert("Please select an exam.");
    return false;
  }

  // Validar email
  const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regexEmail.test(email)) {
    erroEmail.textContent = "Please enter a valid email.";
    return false;
  }
  erroEmail.textContent = "";

  // Mostrar dados no modal de confirmação
  document.getElementById("confSistema").textContent = sistema;
  document.getElementById("confSubopcao").textContent = selectedLabel;
  document.getElementById("confEmail").textContent = email;

  // Guardar valores para submissão
  document.getElementById("confSubopcao").dataset.value = selectedValue;

  // Mostrar modal
  document.getElementById("modalFundo").style.display = "flex";

  return false; // Prevenir submit normal
};

// Função para limpar formulário
function limparFormulario() {
  document.getElementById("sistema").value = "";
  document.getElementById("email").value = "";
  document.getElementById("erroEmail").textContent = "";
  
  // Limpar dropdown customizado
  selectedValue = '';
  selectedLabel = '';
  document.getElementById('subopcao').value = '';
  document.getElementById('selectDisplay').textContent = '-- Choose an option --';
  document.getElementById('selectOptions').innerHTML = '';
  
  atualizarSubopcoes();
}

// Inicializar quando a página carrega
document.addEventListener("DOMContentLoaded", async () => {
  // Carregar subopções
  await carregarSubopcoes();
  
  // Inicializar dropdown customizado
  initCustomSelect();

  // Event listeners para os botões do modal
  document.getElementById("btnSim").addEventListener("click", (e) => {
    e.preventDefault();

    const sistema = document.getElementById("confSistema").textContent;
    const subopcao = document.getElementById("confSubopcao").dataset.value;
    const email = document.getElementById("confEmail").textContent;

    // Enviar para Firebase
    push(ref(db, "respostas"), {
      sistema,
      subopcao,
      email,
      timestamp: new Date().toISOString()
    }).then(() => {
      document.getElementById("modalSucesso").style.display = "flex";
      limparFormulario();
    }).catch((error) => {
      alert("Erro ao enviar: " + error.message);
    });

    document.getElementById("modalFundo").style.display = "none";
  });

  document.getElementById("btnNao").addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("modalFundo").style.display = "none";
  });

  document.getElementById("btnOkSucesso").addEventListener("click", () => {
    document.getElementById("modalSucesso").style.display = "none";
    window.location.reload();
  });
});