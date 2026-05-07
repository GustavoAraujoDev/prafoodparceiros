const API_URL = "https://prafoodapi.onrender.com/products";
// Configuração do som de alerta
const audioAlerta = new Audio(
  "https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3",
);

// Configuração padrão do Toast do SweetAlert2
const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 4000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener("mouseenter", Swal.stopTimer);
    toast.addEventListener("mouseleave", Swal.resumeTimer);
  },
});
let currentUser = null; // Variável global para o usuário

// --- LOGIN ---
// --- LOGIN ---
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-pass").value;
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.message || "Falha no login");

    // 2. Busca os dados do usuário para verificar o Role
    await fetchUserData();

    // 3. Valida se é ADMIN
    if (!currentUser || currentUser.role !== "ADMIN") {
      audioAlerta.play();
      Toast.fire({
        icon: "error",
        title: "Acesso Negado",
        text: "Sua conta não tem permissão de administrador.",
      });
      return;
    }

    Toast.fire({
      icon: "success",
      title: "Acesso Liberado ",
      text: "Sua conta tem permissão de administrador.",
    });

    showDashboard();
  } catch (err) {
    alert("Erro: " + err.message);
  }
});

async function fetchUserData() {
  try {
    const response = await fetch(`${API_URL}/users/me`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) throw new Error("Erro ao carregar perfil");

    currentUser = await response.json();
  } catch (err) {
    console.error("Erro ao buscar dados do usuário:", err);
  }
}

function showDashboard() {
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("main-app").classList.remove("hidden");
  loadProducts();
}

async function logout() {
  try {
    // 1. Chama o Backend para destruir o Cookie
    await fetch(`${API_URL}/logout`, {
      method: "POST",
      credentials: "include", // ESSENCIAL para o navegador enviar/receber cookies
    });
  } catch (err) {
    console.error("Erro ao falar com o servidor no logout:", err);
  } finally {
    // 2. Limpa TUDO no navegador (LocalStorage e Hash)
    localStorage.clear();

    // 3. Reseta o estado local
    currentUser = null;

    // 4. Força o redirecionamento para o login e recarrega
    window.location.hash = "auth";
    window.location.reload();
  }
}

// --- PRODUTOS ---
async function loadProducts() {
  try {
    const res = await fetch(API_URL, {
      method: "GET",

      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await res.json();
    const products = Array.isArray(data) ? data : data.data || [];
    renderTable(products);
  } catch (err) {
    console.error("Erro ao listar:", err);
  }
}

function renderTable(products) {
  const container = document.getElementById("product-list");
  if (products.length === 0) {
    container.innerHTML = `<tr><td colspan="6" class="p-10 text-center text-gray-400">Nenhum item cadastrado.</td></tr>`;
    return;
  }

  container.innerHTML = products
    .map((p) => {
      // Lógica para definir a aparência do botão de status
      const isActive = p.status === "ACTIVE";
      const statusClass = isActive
        ? "text-green-600 bg-green-50 border-green-200"
        : "text-gray-400 bg-gray-50 border-gray-200";
      const iconClass = isActive ? "fa-toggle-on" : "fa-toggle-off";

      return `
        <tr class="border-b hover:bg-gray-50 transition">
            <td class="px-6 py-4">
                <div class="font-bold text-gray-800">${p.name}</div>
                <div class="text-xs text-gray-400 truncate w-48">${p.description}</div>
            </td>
            <td class="px-6 py-4 text-gray-500 uppercase text-xs font-bold">${p.categoryId}</td>
            <td class="px-6 py-4 font-semibold">R$ ${parseFloat(p.basePrice).toFixed(2)}</td>
            
            <td class="px-6 py-4">
                <div class="flex flex-col gap-2">
                    ${p.skus
                      .map(
                        (sku) => `
                        <div class="flex items-center justify-between bg-gray-50 p-1 rounded border border-gray-100">
                            <span class="text-xs font-medium text-gray-600">${sku.name}: <b class="text-gray-900">${sku.stock}</b></span>
                            <div class="flex gap-1">
                                <button onclick="handleStock('${p.id}', '${sku._id}', 'add')" class="text-green-500 hover:text-green-700">
                                    <i class="fas fa-plus-circle text-xs"></i>
                                </button>
                                <button onclick="handleStock('${p.id}', '${sku._id}', 'sell')" class="text-orange-500 hover:text-orange-700">
                                    <i class="fas fa-minus-circle text-xs"></i>
                                </button>
                            </div>
                        </div>
                    `,
                      )
                      .join("")}
                </div>
            </td>

            <td class="px-6 py-4 text-center">
                <button onclick="toggleStatus('${p.id}', '${p.status}')" 
                        class="flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold transition-all ${statusClass}">
                    <i class="fas ${iconClass} text-lg"></i>
                    ${isActive ? "ATIVO" : "INATIVO"}
                </button>
            </td>

            <td class="px-6 py-4 text-right">
                <button onclick="deleteProduct('${p.id}')" class="text-gray-300 hover:text-red-600 transition p-2">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `;
    })
    .join("");
}

async function toggleStatus(productId, currentStatus) {
  const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";

  try {
    const response = await fetch(`${API_URL}/status`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: productId, status: newStatus }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg =
        data.message || data.error || "Erro desconhecido no servidor";

      // Toca áudio e mostra Toast de erro
      audioAlerta.play().catch(() => {}); // catch vazio evita erro se o navegador bloquear autoplay
      Toast.fire({
        icon: "error",
        title: `Erro: ${errorMsg}`,
      });

      throw new Error(errorMsg);
    }

    // Sucesso: Toca áudio e mostra Toast positivo
    audioAlerta.play().catch(() => {});
    Toast.fire({
      icon: "success",
      title: `Produto ${newStatus === "ACTIVE" ? "Ativado" : "Desativado"} com sucesso!`,
    });

    // Se houver função de recarregar a lista, chame-a aqui
    if (typeof loadProducts === "function") loadProducts();
  } catch (error) {
    console.error("Erro:", error);

    // Se o erro não for o que já mostramos acima (ex: erro de rede)
    if (!error.message.includes("Erro na requisição")) {
      audioAlerta.play().catch(() => {});
      Toast.fire({
        icon: "warning",
        title: "Não foi possível conectar ao servidor.",
      });
    }
  }
}

// Funções para Gerenciar a Interface
function addSkuRow() {
  const container = document.getElementById("skus-container");
  const div = document.createElement("div");
  div.className = "bg-white border p-4 rounded-xl shadow-sm space-y-3 sku-row";

  div.innerHTML = `
        <div class="grid grid-cols-3 gap-3">
            <input type="text" placeholder="Nome (Ex: Pizza G)" class="sku-name p-2 border rounded-lg text-sm font-bold" required>
            <input type="number" step="0.01" placeholder="Preço (R$)" class="sku-price p-2 border rounded-lg text-sm" required>
            <input type="number" placeholder="Estoque" class="sku-stock p-2 border rounded-lg text-sm">
        </div>
        
        <div class="bg-gray-50 p-2 rounded-lg">
            <p class="text-[10px] uppercase font-black text-gray-400 mb-2">Atributos (Ex: Sabor: Carne / Tamanho: G)</p>
            <div class="attributes-list space-y-2">
                <div class="flex gap-2 attr-pair">
                    <input type="text" placeholder="Chave (Ex: Sabor)" class="attr-key w-1/2 p-1 border rounded text-xs">
                    <input type="text" placeholder="Valor (Ex: Carne)" class="attr-val w-1/2 p-1 border rounded text-xs">
                </div>
            </div>
            <button type="button" onclick="addAttrField(this)" class="text-[10px] text-blue-500 mt-2 hover:underline">+ Atributo extra</button>
        </div>

        <button type="button" onclick="this.parentElement.remove()" class="text-red-500 text-xs font-bold uppercase">Excluir Variação</button>
    `;
  container.appendChild(div);
}

// Função auxiliar para adicionar mais de um atributo por SKU (ex: Sabor E Tamanho)
function addAttrField(btn) {
  const list = btn.previousElementSibling;
  const div = document.createElement("div");
  div.className = "flex gap-2 attr-pair"; // ADICIONE A CLASSE attr-pair AQUI
  div.innerHTML = `
        <input type="text" placeholder="Chave" class="attr-key w-1/2 p-1 border rounded text-xs">
        <input type="text" placeholder="Valor" class="attr-val w-1/2 p-1 border rounded text-xs">
    `;
  list.appendChild(div);
}

function addModifierRow() {
  const container = document.getElementById("modifiers-container");
  const div = document.createElement("div");
  div.className = "grid grid-cols-3 gap-2 border-b pb-2 modifier-row";
  div.innerHTML = `
        <input type="text" placeholder="Adicional (Ex: Bacon)" class="mod-name p-1 border rounded text-sm" required>
        <input type="number" step="0.01" placeholder="Preço" class="mod-price p-1 border rounded text-sm" required>
        <button type="button" onclick="this.parentElement.remove()" class="text-red-500 text-xs">Remover</button>
    `;
  container.appendChild(div);
}

// Inicializa com uma linha de cada
addSkuRow();
addModifierRow();

// SUBMISSÃO DO FORMULÁRIO
document
  .getElementById("product-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const allAttributeKeys = new Set();

    // Coletar SKUs (Variantes)
    const skus = Array.from(document.querySelectorAll(".sku-row")).map(
      (row) => {
        const skuObj = {
          name: row.querySelector(".sku-name").value,
          price: parseFloat(row.querySelector(".sku-price").value),
          stock: parseInt(row.querySelector(".sku-stock").value) || 0,
          attributes: {},
        };

        row.querySelectorAll(".attr-pair").forEach((pair, index) => {
          const inputChave = pair.querySelector(".attr-key");
          const inputValor = pair.querySelector(".attr-val");

          if (inputChave && inputValor) {
            const k = inputChave.value.trim();
            const v = inputValor.value.trim();

            // Alert para identificar qual par de atributo está sendo lido
            alert(`Lendo Atributo #${index + 1}`);

            if (k && v) {
              skuObj.attributes[k] = v;
              allAttributeKeys.add(k);
            }
          }
        });
        return skuObj;
      },
    );

    // 2. Coletar Modifiers (Adicionais)
    const modifierItems = Array.from(
      document.querySelectorAll(".modifier-row"),
    ).map((row) => ({
      id: "item-" + Math.random().toString(36).substr(2, 9),
      name: row.querySelector(".mod-name").value,
      price: parseFloat(row.querySelector(".mod-price").value),
    }));

    // 3. Montar Objeto Final
    const productData = {
      name: document.getElementById("prod-name").value,
      description: document.getElementById("prod-description").value,
      basePrice: parseFloat(document.getElementById("prod-base-price").value),
      images: [
        document.getElementById("prod-image").value ||
          "https://site.com/placeholder.png",
      ],
      categoryId: document.getElementById("prod-cat-id").value,
      attribute_keys: Array.from(allAttributeKeys), // Importante
      status: "ACTIVE",
      skus: skus,
      modifiers: [
        {
          id: "mod-extras",
          name: "Adicionais",
          required: false,
          min: 0,
          max: 10,
          items: modifierItems,
        },
      ],
      availability: {
        days: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
        start: document.getElementById("avail-start").value,
        end: document.getElementById("avail-end").value,
      },
    };

    // 4. Enviar para API
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productData),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Erro na API");

      alert("Produto e variações salvos!");
      closeModal();
    } catch (err) {
      alert("Falha: " + err.message);
    }
  });

async function deleteProduct(id) {
  // 1. Confirmação inicial
  if (!confirm(`Remover o item ${id}?`)) return;

  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });

    // 2. Tenta ler o JSON de resposta (seja sucesso ou erro)
    const data = await res.json();

    if (!res.ok) {
      // Se o status não for 200-299, lança um erro com a mensagem da API
      throw new Error(data.error || "Erro desconhecido ao deletar");
      alert(data.error);
    }

    // 3. Sucesso
    alert("Sucesso: " + (data.message || "Produto removido!"));
    loadProducts();
  } catch (err) {
    // 4. Exibe o erro no alert (CastError, 404, 500, etc)
    console.error("Erro completo:", err);
    alert("Erro na exclusão: " + err.message);
  }
}

function openModal() {
  document.getElementById("product-form").reset();
  document.getElementById("product-modal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("product-modal").classList.add("hidden");
}

// --- GESTÃO DE PEDIDOS ---
async function loadOrders() {
  try {
    const res = await fetch(`https://prafoodapi.onrender.com/pedidos`, {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    const orders = await res.json();
    renderOrders(orders);
  } catch (err) {
    console.error("Erro ao carregar pedidos:", err);
  }
}

function renderOrders(orders) {
  const container = document.getElementById("orders-container");

  if (!orders || orders.length === 0) {
    container.innerHTML =
      '<p class="p-4 text-gray-500 text-center">Nenhum pedido encontrado.</p>';
    return;
  }

  container.innerHTML = orders
    .map((order) => {
      const displayId = order.id || order._id;
      const databaseId = order._id || order.id;
      const dataPedido = order.createdAt
        ? new Date(order.createdAt).toLocaleTimeString()
        : "00:00";
      const total = order.pagamento?.total || 0;

      // Pegamos o tipo de entrega (DELIVERY ou TAKEOUT)
      const tipoEntrega = order.entrega?.tipo || "DELIVERY";

      const statusColors = {
        CREATED: "border-yellow-400",
        PREPARING: "border-blue-500",
        READY: "border-purple-500",
        ON_THE_WAY: "border-orange-500",
        DELIVERED: "border-green-500",
        CANCELED: "border-red-600",
      };

      // MUDANÇA: Adicionamos data-status e data-type no container principal
      return `
        <div data-status="${order.status}" data-type="${tipoEntrega}" class="bg-white p-6 rounded-xl shadow-sm border-l-8 ${statusColors[order.status] || "border-gray-200"}">
            <div class="flex justify-between mb-4">
                <span class="font-bold text-lg text-gray-800">${displayId}</span>
                <span class="text-sm text-gray-500">${dataPedido}</span>
            </div>
            
            <div class="mb-4">
                <p class="font-bold">${order.cliente?.nome || "Cliente"}</p>
                <p class="text-xs text-gray-500 uppercase">${tipoEntrega}</p>
            </div>

            <div class="border-t border-b py-2 mb-4">
                ${
                  order.itens
                    ? order.itens
                        .map(
                          (i) => `
                    <div class="text-sm">${i.quantity || 1}x ${i.name || i.nome}</div>
                `,
                        )
                        .join("")
                    : ""
                }
            </div>

            <div class="flex justify-between items-center">
                <span class="font-bold text-red-600 text-xl">R$ ${Number(total).toFixed(2)}</span>
                <div class="flex gap-2">
                    <button onclick="printOrder('${displayId}')" class="bg-gray-100 p-2 rounded hover:bg-gray-200">
                        🖨️
                    </button>
                    <select onchange="updateOrderStatus('${databaseId}', this.value)" class="text-sm border rounded p-1">
                        <option value="CREATED" ${order.status === "CREATED" ? "selected" : ""}>Pendente</option>
                        <option value="PREPARING" ${order.status === "PREPARING" ? "selected" : ""}>Preparando</option>
                        <option value="READY" ${order.status === "READY" ? "selected" : ""}>Pronto</option>
                        <option value="ON_THE_WAY" ${order.status === "ON_THE_WAY" ? "selected" : ""}>Em rota</option>
                        <option value="DELIVERED" ${order.status === "DELIVERED" ? "selected" : ""}>Entregue</option>
                    </select>
                </div>
            </div>
        </div>
    `;
    })
    .join("");
}

async function updateOrderStatus(orderId, newStatus) {
  // Feedback visual imediato
  Swal.fire({
    title: "Atualizando status...",
    didOpen: () => Swal.showLoading(),
    allowOutsideClick: false,
  });

  try {
    const response = await fetch(
      `https://prafoodapi.onrender.com/pedidos/${orderId}/status`,
      {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      },
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Erro na transição de status");
    }

    const pedidoAtualizado = result.data;

    // 🔥 LÓGICA DE VENDA AUTOMÁTICA
    if (newStatus === "READY") {
      await processarVendasDoPedido(pedidoAtualizado);
    }

    // Sucesso
    Swal.fire({
      icon: "success",
      title: "Sucesso!",
      text: `Pedido movido para ${newStatus} e estoque atualizado.`,
      timer: 2000,
      showConfirmButton: false,
    });

    if (typeof loadOrders === "function") loadOrders();
  } catch (err) {
    console.error("[STATUS_UPDATE_ERROR]:", err);
    Swal.fire({
      icon: "error",
      title: "Falha na operação",
      text: err.message,
    });
  }
}

async function processarVendasDoPedido(pedido) {
  if (!pedido.itens || pedido.itens.length === 0) return;

  const promessasVendas = pedido.itens.map(async (itemPedido) => {
    try {
      // 1. Busca o produto completo para encontrar os SKUs
      const resProduto = await fetch(`${API_URL}/${itemPedido.productId}`, {
        credentials: "include",
      });

      if (!resProduto.ok)
        throw new Error(`Produto ${itemPedido.productId} não encontrado.`);

      const produtoFull = await resProduto.json();
      const dadosProduto = produtoFull.data || produtoFull; // Ajuste conforme sua API retorna

      // 2. Localiza o SKU que corresponde ao tamanho do pedido
      // Compara "media" do pedido com "media" do cadastro do produto
      const skuCorrespondente = dadosProduto.skus.find(
        (sku) => sku.name.toLowerCase() === itemPedido.size.toLowerCase(),
      );

      if (!skuCorrespondente) {
        throw new Error(
          `Tamanho "${itemPedido.size}" não encontrado no cadastro do produto.`,
        );
      }

      // 3. Agora sim, faz a venda usando o ID real do SKU
      const resVenda = await fetch(`${API_URL}/${itemPedido.productId}/sell`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: itemPedido.productId,
          skuId: skuCorrespondente._id, // O ID real: "SKU-177..."
          quantity: parseInt(itemPedido.quantity),
        }),
      });

      if (!resVenda.ok) {
        const errorData = await resVenda.json();
        throw new Error(errorData.message || "Erro ao abater estoque");
      }

      return `Sucesso: ${itemPedido.name}`;
    } catch (err) {
      console.error(`[ERRO_ITEM]: ${itemPedido.name}`, err.message);
      throw err; // Repassa para o Promise.all interromper ou logar
    }
  });

  try {
    await Promise.all(promessasVendas);
    console.log("✅ Todos os itens foram processados com sucesso.");
  } catch (err) {
    // Lança o erro para ser capturado pelo Swal na função principal (updateOrderStatus)
    throw new Error(`Erro no processamento de estoque: ${err.message}`);
  }
}

async function printOrder(id) {
  // Show a "Loading" state so the user knows something is happening
  Toast.fire({
    title: "Processando...",
    text: "Enviando pedido para a impressora",
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });

  try {
    const response = await fetch("https://prafoodapi.onrender.com/pedidos/imprimir", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pedidoId: id }),
    });

    const result = await response.json();

    if (response.ok) {
      // Success Alert
      Toast.fire({
        icon: "success",
        title: "Sucesso!",
        text: result.message || "Pedido enviado para a impressora.",
        timer: 3000,
        showConfirmButton: false,
      });
    } else {
      // Server-side Error
      Toast.fire({
        icon: "error",
        title: "Erro na Impressão",
        text: result.error || "Não foi possível imprimir o pedido.",
      });
    }
  } catch (err) {
    // Network or Runtime Error
    Toast.fire({
      icon: "error",
      title: "Ops!",
      text: "Falha na conexão com o servidor.",
    });
  }
}

let myCharts = {}; // Armazena instâncias dos gráficos

function renderDashboard(orders) {
  // 1. Cálculos de KPIs
  const totalSales = orders
    .filter((o) => o.status !== "CANCELED")
    .reduce((acc, curr) => acc + (curr.pagamento?.total || 0), 0);

  const totalOrders = orders.length;
  const ticketMedio = totalOrders > 0 ? totalSales / totalOrders : 0;

  document.getElementById("kpi-vendas").innerText =
    `R$ ${totalSales.toFixed(2)}`;
  document.getElementById("kpi-pedidos").innerText = totalOrders;
  document.getElementById("kpi-ticket").innerText =
    `R$ ${ticketMedio.toFixed(2)}`;

  // 2. Processamento para Gráfico de Status
  const statusCount = {};
  orders.forEach(
    (o) => (statusCount[o.status] = (statusCount[o.status] || 0) + 1),
  );

  // 3. Processamento para Gráfico de Pagamentos
  const paymentCount = {};
  orders.forEach((o) => {
    const method = o.pagamento?.metodo || "Outros";
    paymentCount[method] = (paymentCount[method] || 0) + 1;
  });

  // Renderizar Gráficos
  updateChart(
    "chartStatus",
    Object.keys(statusCount),
    Object.values(statusCount),
    "Pedidos por Status",
    "doughnut",
  );
  updateChart(
    "chartPayments",
    Object.keys(paymentCount),
    Object.values(paymentCount),
    "Pagamentos",
    "bar",
  );
}

function updateChart(canvasId, labels, data, label, type) {
  if (myCharts[canvasId]) myCharts[canvasId].destroy(); // Destroi o gráfico anterior antes de criar novo

  const ctx = document.getElementById(canvasId).getContext("2d");
  myCharts[canvasId] = new Chart(ctx, {
    type: type,
    data: {
      labels: labels,
      datasets: [
        {
          label: label,
          data: data,
          backgroundColor: [
            "#ea1d2c",
            "#3b82f6",
            "#10b981",
            "#f59e0b",
            "#6366f1",
            "#ef4444",
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom" } },
    },
  });
}

let allOrdersData = []; // Variável global para guardar os pedidos sem precisar ir no banco toda hora

async function loadDashboardData() {
  try {
    const res = await fetch("https://prafoodapi.onrender.com/pedidos", {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });
    allOrdersData = await res.json();
    applyDashFilters(); // Aplica o filtro inicial
  } catch (err) {
    console.error("Erro ao carregar dados do dashboard:", err);
  }
}

function applyDashFilters() {
  const period = document.getElementById("dash-filter-period").value;
  const payment = document.getElementById("dash-filter-payment").value;

  const now = new Date();

  let filtered = allOrdersData.filter((order) => {
    const orderDate = new Date(order.createdAt);
    const diffTime = Math.abs(now - orderDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // 1. Filtro de Tempo
    let timeMatch = true;
    if (period === "today")
      timeMatch = orderDate.toDateString() === now.toDateString();
    else if (period === "yesterday") {
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      timeMatch = orderDate.toDateString() === yesterday.toDateString();
    } else if (period === "7days") timeMatch = diffDays <= 7;
    else if (period === "30days") timeMatch = diffDays <= 30;

    // 2. Filtro de Pagamento
    let paymentMatch = payment === "all" || order.pagamento?.metodo === payment;

    return timeMatch && paymentMatch;
  });

  renderDashboard(filtered); // Chama a função que desenha os gráficos com os dados filtrados
}

// Exemplo de automação no Frontend
// Variável para controle do primeiro funcionamento
let primeiraBusca = true;

setInterval(async () => {
  try {
    // Log discreto no console apenas para debugar
    if (primeiraBusca) {
      console.log("🔍 Monitoramento de pedidos ativos...");
      primeiraBusca = false;
    }

    const res = await fetch("https://prafoodapi.onrender.com/pedidos/pendentes", {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) return;

    const novosPedidos = await res.json();

    if (novosPedidos.length > 0) {
      // Tocar som de notificação
      audioAlerta
        .play()
        .catch((e) =>
          console.log(
            "Som bloqueado pelo navegador. Clique na página primeiro.",
          ),
        );

      // Notificação elegante (Toast)
      Toast.fire({
        icon: "success",
        title: `${novosPedidos.length} novo(s) pedido(s) recebido(s)!`,
        text: "Enviando para a impressora...",
      });

      for (let pedido of novosPedidos) {
        const pedidoId = pedido._id || pedido.id;

        // 1. Atualiza status para não repetir a impressão
        await updateOrderStatus(pedidoId, "PREPARING");

        // 2. Imprime (sua função já existente)
        await printOrder(pedidoId);
      }

      // Opcional: Recarregar a lista de pedidos se o usuário estiver na tela de pedidos
      if (
        !document.getElementById("section-orders").classList.contains("hidden")
      ) {
        loadOrders();
      }
    }
  } catch (err) {
    console.error("❌ Erro no monitor:", err);
  }
}, 5000);

// Lógica de Filtragem do Cardápio
function filterMenu() {
  const searchTerm = document
    .getElementById("filter-menu-search")
    .value.toLowerCase();
  const catFilter = document
    .getElementById("filter-menu-cat")
    .value.toLowerCase();
  const statusFilter = document.getElementById("filter-menu-status").value;

  const rows = document.querySelectorAll("#product-list tr");

  rows.forEach((row) => {
    const name = row.cells[0].innerText.toLowerCase();
    const category = row.cells[1].innerText.toLowerCase();

    // MUDANÇA AQUI: Pegamos o valor do atributo 'data-status' que injetaremos na TD
    const statusValue = row.cells[3].getAttribute("data-status");

    const matchesSearch = name.includes(searchTerm);
    const matchesCat = catFilter === "all" || category.includes(catFilter);
    const matchesStatus =
      statusFilter === "all" || statusValue === statusFilter;

    // Aplica a visibilidade
    row.style.display =
      matchesSearch && matchesCat && matchesStatus ? "" : "none";
  });
}

// Lógica de Filtragem de Pedidos
function filterOrders() {
  const searchTerm = document
    .getElementById("filter-order-search")
    .value.toLowerCase();
  const statusFilter = document.getElementById("filter-order-status").value;
  const typeFilter = document.getElementById("filter-order-type").value;

  const orders = document.querySelectorAll("#orders-container > div"); // Seleciona os cards de pedidos

  orders.forEach((order) => {
    // Aqui assume-se que você guarda o status/tipo em atributos 'data-' ou classes
    const text = order.innerText.toLowerCase();
    const orderStatus = order.getAttribute("data-status");
    const orderType = order.getAttribute("data-type");

    const matchesSearch = text.includes(searchTerm);
    const matchesStatus =
      statusFilter === "all" || orderStatus === statusFilter;
    const matchesType = typeFilter === "all" || orderType === typeFilter;

    order.style.display =
      matchesSearch && matchesStatus && matchesType ? "block" : "none";
  });
}
// Adicionamos o parâmetro skuId na assinatura da função
async function handleStock(productId, skuId, type) {
  const isAdd = type === "add";

  const { value: quantity } = await Swal.fire({
    title: isAdd ? "Entrada de Estoque" : "Registrar Venda",
    input: "number", // Mudado para number para facilitar no celular/teclado
    inputLabel: `Quantidade para ${isAdd ? "adicionar" : "remover"}`,
    inputPlaceholder: "Ex: 10",
    showCancelButton: true,
    confirmButtonText: "Confirmar",
    cancelButtonText: "Cancelar",
    inputValidator: (value) => {
      if (!value || isNaN(value) || parseInt(value) <= 0) {
        return "Insira uma quantidade válida e maior que zero!";
      }
    },
  });

  alert(skuId);

  if (quantity) {
    Swal.fire({
      title: "Processando...",
      didOpen: () => Swal.showLoading(),
      allowOutsideClick: false,
    });

    try {
      // O endpoint pode continuar usando o productId na URL
      const endpoint = isAdd ? `/${productId}/addstock` : `/${productId}/sell`;

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          skuId, // 🔥 ENVIANDO O SKU CORRETO (Média ou Grande)
          quantity: parseInt(quantity),
        }),
      });

      let result;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        result = await res.json();
      }

      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "Sucesso!",
          text: result?.message || "Operação realizada com sucesso.",
          timer: 2000,
          showConfirmButton: false,
        });
        loadProducts();
      } else {
        // Aqui o Swal vai mostrar exatamente o "throw new Error" do seu backend
        // Ex: "Estoque insuficiente para Grande"
        const errorMsg =
          result?.error || result?.message || "Erro no servidor.";
        throw new Error(errorMsg);
      }
    } catch (err) {
      console.error("Erro detalhado:", err);

      Swal.fire({
        icon: "error",
        title: "Ação interrompida",
        text: err.message,
        confirmButtonColor: "#d33",
      });
    }
  }
}

// Função que roda assim que a página carrega
async function restaurarSessao() {
  try {
    // 1. Tenta buscar o usuário (o cookie vai automático via credentials)
    await fetchUserData();

    // 2. Se chegamos aqui, o login foi bem sucedido via cookie
    if (currentUser && currentUser.role === "ADMIN") {
      // Esconde login e mostra o App
      document.getElementById("login-screen").classList.add("hidden");
      document.getElementById("main-app").classList.remove("hidden");

      // 3. Recupera a última aba salva no F5 (ou padrão 'menu')
      const ultimaAba = localStorage.getItem("admin_last_section") || "menu";
      toggleSection(ultimaAba);

      // 4. Inicia o monitor de pedidos se ele existir
      if (typeof monitorarNovosPedidos === "function") {
        setInterval(monitorarNovosPedidos, 5000);
      }
    } else if (currentUser) {
      // Se for cliente, mostra a tela de menu do cliente
      showMenu();
    }
  } catch (err) {
    // Se der erro (ex: cookie expirou), mostra a tela de login
    console.log("Sem sessão ativa. Aguardando login.");
    document.getElementById("login-screen").classList.remove("hidden");
  }
}

// Executa a restauração assim que o script carregar
restaurarSessao();

// --- NAVEGAÇÃO ---
async function toggleSection(section) {
  // 🔥 NOVO: Salva a seção atual para não perder no F5
  localStorage.setItem("admin_last_section", section);

  const sections = ["menu", "orders", "dashboard"];

  sections.forEach((s) => {
    const el = document.getElementById(`section-${s}`);
    const nav = document.getElementById(`nav-${s}`);
    if (el) el.classList.toggle("hidden", s !== section);

    if (nav) {
      nav.className =
        s === section
          ? "block font-bold text-red-600 border-l-4 border-red-600 pl-3 bg-red-50 py-2"
          : "block text-gray-500 hover:text-red-500 pl-4 transition py-2";
    }
  });

  // Gatilhos de carregamento de dados
  if (section === "menu") loadProducts();
  if (section === "orders") loadOrders();
  if (section === "dashboard") {
    loadDashboardData();
    try {
      const res = await fetch(`https://prafoodapi.onrender.com/pedidos`, {
        method: "GET",
        credentials: "include",
      });
      const orders = await res.json();
      renderDashboard(orders);
    } catch (e) {
      console.error("Erro dashboard:", e);
    }
  }
}

// --- ESTADO DAS MESAS ---
let selectedTable = null;
let tablesData = {}; // { 1: [itens], 2: [] ... }
let allProductsGlobal = []; // Armazena os produtos vindos da API

// Escudos para evitar erros de funções do cliente que não existem no Admin
let currentProduct = null;
function switchTab(tab) {
  console.log("Troca de aba ignorada no Admin");
}
function updateTotal() {
  console.log("Total atualizado");
}

// Inicializa 10 mesas se não existirem
// 1. Inicializa as mesas buscando do BANCO DE DADOS
async function initTables() {
  // Pega o ID da empresa (certifique-se que storeTag está disponível globalmente)
  const companyId = typeof storeTag !== "undefined" ? storeTag : "ADMIN-LOCAL";

  try {
    // Busca o estado atual no servidor
    const res = await fetch(
      `https://prafoodapi.onrender.com/products/tables/status/${companyId}`,
    );
    const result = await res.json();

    if (res.ok && result.tables) {
      // Se encontrou no banco, carrega
      tablesData = result.tables;
      console.log("Dados das mesas carregados do servidor.");
    } else {
      // Se não houver no banco, tenta o backup local
      const saved = localStorage.getItem("prafood_tables_data");
      if (saved) tablesData = JSON.parse(saved);
    }
  } catch (err) {
    console.error("Erro ao conectar com servidor, usando localStorage:", err);
    const saved = localStorage.getItem("prafood_tables_data");
    if (saved) tablesData = JSON.parse(saved);
  }

  // Garante que as 10 mesas existam no objeto para evitar erros de renderização
  for (let i = 1; i <= 10; i++) {
    if (!tablesData[i]) tablesData[i] = [];
  }

  renderTablesGrid();
}

// Renderiza os quadradinhos das mesas
function renderTablesGrid() {
  const grid = document.getElementById("tables-grid");
  if (!grid) return;

  grid.innerHTML = "";
  for (let i = 1; i <= 10; i++) {
    const hasItems = tablesData[i].length > 0;
    const isActive = selectedTable === i;

    grid.innerHTML += `
            <div onclick="selectTable(${i})" 
                 class="h-20 flex flex-col items-center justify-center rounded-2xl cursor-pointer transition-all border-2 
                 ${isActive ? "border-red-600 bg-red-50 ring-2 ring-red-100" : hasItems ? "bg-amber-50 border-amber-400 animate-pulse" : "bg-white border-gray-100 hover:border-red-200"}">
                <span class="text-[10px] font-bold ${hasItems ? "text-amber-600" : "text-gray-400"}">MESA</span>
                <span class="text-2xl font-black ${hasItems ? "text-amber-700" : "text-gray-800"}">${i}</span>
                ${hasItems ? `<span class="text-[9px] font-bold text-amber-600">${tablesData[i].length} ITENS</span>` : ""}
            </div>
        `;
  }
}

// Seleciona uma mesa para gerenciar
function selectTable(num) {
  selectedTable = num;
  document.getElementById("table-workspace").classList.remove("hidden");
  document.getElementById("selected-table-badge").classList.remove("hidden");
  document.getElementById("active-table-number").innerText = num;

  renderTablesGrid();

  const tableMenuContainer = document.getElementById("table-menu-container");

  // Verifica se os produtos já foram carregados, se não, carrega antes de renderizar
  if (allProductsGlobal.length === 0) {
    loadProducts().then(() => {
      renderProductsForAdmin(allProductsGlobal, tableMenuContainer);
    });
  } else {
    renderProductsForAdmin(allProductsGlobal, tableMenuContainer);
  }

  updateTableSummary();
}

// Versão simplificada do seu renderProducts para caber na lateral do Admin
function renderProductsForAdmin(products, container) {
  const filtered = products.filter((p) => p.status === "ACTIVE");

  container.innerHTML = filtered
    .map(
      (p) => `
        <div class="flex justify-between items-center p-3 border rounded-xl hover:bg-gray-50 cursor-pointer shadow-sm transition-colors mb-2" 
             onclick='openProductDetailsForTable(${JSON.stringify(p).replace(/'/g, "&apos;")})'>
            <div class="flex-1 pr-2">
                <h4 class="font-bold text-gray-800 uppercase text-[10px]">${p.name}</h4>
                <p class="text-red-600 font-bold text-xs">R$ ${Number(p.basePrice || 0).toFixed(2)}</p>
            </div>
            ${p.images?.[0] ? `<img src="${p.images[0]}" class="w-10 h-10 rounded-lg object-cover">` : ""}
        </div>
    `,
    )
    .join("");
}

function cancelTableSelection() {
  selectedTable = null;
  document.getElementById("table-workspace").classList.add("hidden");
  document.getElementById("selected-table-badge").classList.add("hidden");
  renderTablesGrid();
}

// Renderiza uma versão compacta do seu cardápio para o Admin clicar
function renderTableMenu() {
  const container = document.getElementById("table-menu-container");
  // 'products' deve ser sua variável global que contém os itens do cardápio
  container.innerHTML = products
    .map(
      (p) => `
        <div onclick="openProductDetailsForTable('${p.id}')" class="flex items-center p-3 border rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
            <div class="flex-1">
                <h4 class="text-xs font-bold uppercase">${p.name}</h4>
                <p class="text-red-600 font-bold text-xs">R$ ${p.basePrice.toFixed(2)}</p>
            </div>
            <i class="fas fa-plus-circle text-gray-300 text-xl"></i>
        </div>
    `,
    )
    .join("");
}

function closeAdminTableModal() {
  document.getElementById("admin-table-item-modal").classList.add("hidden");
}

function openProductDetailsForTable(product) {
  const modal = document.getElementById("admin-table-item-modal");
  if (!modal) return;

  // 1. Exibe o modal
  modal.classList.remove("hidden");

  // 2. Renderiza o conteúdo (sua função copiada)
  openProductDetails(product);

  // 3. Segurança: Garante que o Admin não saia da tela de mesas
  setTimeout(() => {
    document.getElementById("section-tables").classList.remove("hidden");
  }, 10);

  // 4. Configura o botão de confirmação do Modal
  const btnConfirm = document.getElementById("btn-add-to-table");
  if (btnConfirm) {
    btnConfirm.innerText = `ADICIONAR À MESA ${selectedTable}`;
    btnConfirm.onclick = (e) => {
      e.preventDefault();
      saveItemToTable(product);
      closeAdminTableModal();
    };
  }
}

function filterMenuTable() {
  const term = document
    .getElementById("search-table-product")
    .value.toLowerCase();
  const filtered = allProductsGlobal.filter(
    (p) => p.name.toLowerCase().includes(term) && p.status === "ACTIVE",
  );
  const container = document.getElementById("table-menu-container");
  renderProductsForAdmin(filtered, container);
}

function saveItemToTable(product) {
  // 1. Validações iniciais
  const selectedSku = document.querySelector('input[name="sku-opt"]:checked');
  if (!selectedSku)
    return Swal.fire("Atenção", "Selecione um tamanho/opção.", "warning");

  if (!selectedTable)
    return Swal.fire("Erro", "Nenhuma mesa selecionada.", "error");

  // 2. Captura de valores básicos
  const qty = parseInt(document.getElementById("main-qty").value) || 1;
  const priceBase = parseFloat(selectedSku.value);

  // 3. Processamento de modificadores (Adicionais)
  let modsTotal = 0;
  let modsList = [];
  document.querySelectorAll(".modifier-qty").forEach((input) => {
    const val = parseInt(input.value);
    if (val > 0) {
      modsTotal += parseFloat(input.dataset.price) * val;
      modsList.push(`${val}x ${input.dataset.name}`);
    }
  });

  // 4. Montagem do objeto do item (Compatível com seu Swagger/Schema)
  const itemComanda = {
    productId: product._id || product.id, // Suporta ambos os formatos de ID
    category: product.categoryId || product.category || "Geral",
    name: product.name,
    sku: selectedSku.dataset.name,
    qty: qty,
    priceUnit: priceBase + modsTotal,
    total: (priceBase + modsTotal) * qty,
    details: modsList.join(", "),
    obs: document.getElementById("product-note")?.value || "",
  };

  // 5. Atualização do estado local
  if (!tablesData[selectedTable]) tablesData[selectedTable] = [];
  tablesData[selectedTable].push(itemComanda);

  // 6. Atualização da UI
  updateTableSummary();
  renderTablesGrid();

  // 7. Sincronização com LocalStorage e MongoDB (A função que criamos antes)
  saveTablesToStorage();

  // 8. Feedback e fechamento do modal
  closeAdminTableModal();

  // Toast opcional para confirmar que foi para a mesa
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 1500,
    timerProgressBar: true,
  });

  Toast.fire({
    icon: "success",
    title: `Item adicionado à Mesa ${selectedTable}`,
  });
}

function updateTableSummary() {
  const container = document.getElementById("current-table-items");
  const items = tablesData[selectedTable] || [];
  let total = 0;

  container.innerHTML = items
    .map((item, index) => {
      total += item.total;
      return `
            <div class="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                <div class="flex justify-between items-start mb-1">
                    <span class="font-bold text-gray-800">${item.qty}x ${item.name}</span>
                    <span class="font-black">R$ ${item.total.toFixed(2)}</span>
                </div>
                <p class="text-gray-500">${item.sku} ${item.details ? " • " + item.details : ""}</p>
                ${item.obs ? `<p class="text-red-500 italic mt-1 font-medium">Obs: ${item.obs}</p>` : ""}
                <button onclick="removeItemFromTable(${index})" class="mt-2 text-red-500 font-bold uppercase text-[9px] hover:underline">Remover</button>
            </div>
        `;
    })
    .join("");

  if (items.length === 0) {
    container.innerHTML =
      '<div class="text-center py-6"><i class="fas fa-receipt text-gray-200 text-3xl mb-2"></i><p class="text-gray-400 text-xs font-medium">Comanda vazia</p></div>';
  }

  document.getElementById("table-total").innerText = `R$ ${total.toFixed(2)}`;
  document.getElementById("table-subtotal").innerText =
    `R$ ${total.toFixed(2)}`;
}

function removeItemFromTable(index) {
  tablesData[selectedTable].splice(index, 1);
  saveTablesToStorage(); // <--- ADICIONE ESTA LINHA
  updateTableSummary();
  renderTablesGrid();
}

async function closeTableAccount() {
  const itemsMesa = tablesData[selectedTable];

  if (!itemsMesa || itemsMesa.length === 0) {
    return Swal.fire({ icon: "error", title: "Mesa sem itens!" });
  }

  const result = await Swal.fire({
    title: `Fechar Mesa ${selectedTable}?`,
    text: "Confirma o encerramento da conta e impressão?",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Sim, Finalizar!",
    confirmButtonColor: "#ea1d2c",
  });

  if (!result.isConfirmed) return;

  // Pegamos o ID do Admin logado para satisfazer a auditoria do servidor
  // currentUser costuma vir da sua função restaurarSessao()
  const adminId = currentUser?.id || currentUser?.sub || currentUser?._id;
  const subtotal = itemsMesa.reduce((sum, item) => sum + item.total, 0);

  // MONTAGEM DO OBJETO COMPATÍVEL COM SEU SCHEMA/CLASSE
  const pedidoMesa = {
    companyId: typeof storeTag !== "undefined" ? storeTag : "ADMIN-LOCAL",
    userId: adminId, // 🔥 Preenche o userId com o ID do Admin
    // userId: null, // Pode omitir ou enviar null, já que no Schema é opcional agora
    cliente: {
      nome: `Mesa ${selectedTable}`,
      telefone: "000000000", // Valor padrão para passar na validação se necessário
      email: "atendimento@local.com",
    },
    itens: itemsMesa.map((item) => ({
      productId: item.productId,
      name: item.name,
      category: item.category || "Geral", // Campo exigido no seu itemSchema
      size: item.sku,
      quantity: item.qty,
      unitPrice: item.priceUnit, // Nome exato do seu Schema
      totalPrice: item.total, // Nome exato do seu Schema
      extras: item.details ? [item.details] : [], // Seu Schema espera Array de Strings
      notes: item.obs,
    })),
    pagamento: {
      metodo: "BALCÃO",
      total: subtotal,
      status: "PAID", // Como está fechando no balcão, já marcamos como pago
    },
    entrega: {
      tipo: "DINE_IN", // Nome exato do seu enum na Classe/Schema
      mesa: selectedTable,
      taxaEntrega: 0,
    },
    status: "CONFIRMED", // Inicia como confirmado para ir direto para a cozinha/impressão
  };

  try {
    // 1. Salva no Banco via sua API
    const pedidoSalvo = await criarPedidoNoSistema(pedidoMesa);

    // 2. Chama a impressão usando o ID retornado pelo banco
    if (typeof printOrder === "function") {
      await printOrder(pedidoSalvo.id || pedidoSalvo._id);
    }

    // 3. Limpa os dados locais (F5 não trará os itens de volta pois a mesa fechou)
    tablesData[selectedTable] = [];
    if (typeof saveTablesToStorage === "function") saveTablesToStorage();

    renderTablesGrid();
    cancelTableSelection();

    Swal.fire({
      icon: "success",
      title: "Conta Fechada!",
      text: "O pedido foi registrado e enviado para a impressora.",
      timer: 2000,
      showConfirmButton: false,
    });
  } catch (err) {
    Swal.fire({
      icon: "error",
      title: "Erro ao fechar mesa",
      text: err.message,
    });
  }
}

async function criarPedidoNoSistema(pedidoFinal) {
  Swal.fire({
    title: "Processando pedido...",
    didOpen: () => Swal.showLoading(),
    allowOutsideClick: false,
  });

  const res = await fetch(`https://prafoodapi.onrender.com/pedidos`, {
    // Usando a constante de ambiente que definimos antes
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pedidoFinal),
  });

  const result = await res.json();

  if (!res.ok) {
    throw new Error(result.error || result.message || "Erro ao salvar pedido.");
  }

  return result.data; // Retorna o pedido criado (contendo o ID gerado pelo banco)
}

function openProductDetails(product) {
  currentProduct = product;
  switchTab("details");
  const content = document.getElementById("product-details-content");

  // 1. Renderizar SKUs (Tamanhos)
  const skusHTML = (product.skus || [])
    .map((sku, index) => {
      const isOutOfStock = sku.stock <= 0;
      return `
            <label class="flex-1 ${isOutOfStock ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}">
                <input type="radio" name="sku-opt" value="${sku.price}" 
                    class="peer hidden" 
                    data-name="${sku.name}"
                    data-stock="${sku.stock}"
                    ${index === 0 && !isOutOfStock ? "checked" : ""} 
                    ${isOutOfStock ? "disabled" : ""}
                    onchange="renderAttributes(${index}); updateTotal(); resetMainQty()">
                <div class="p-3 border rounded-xl text-center peer-checked:border-red-600 peer-checked:bg-red-50 transition-all">
                    <span class="block font-bold text-xs uppercase">${sku.name}</span>
                    <span class="block text-xs text-gray-500 font-normal">R$ ${sku.price.toFixed(2)}</span>
                    ${isOutOfStock ? '<span class="text-[10px] text-red-500 font-bold">ESGOTADO</span>' : ""}
                </div>
            </label>
        `;
    })
    .join("");

  // 2. Renderizar Grupos de Modificadores Dinamicamente
  const modifiersHTML = (product.modifiers || [])
    .map((group, groupIndex) => {
      // FILTRO: Só mostra itens ATIVOS
      const activeItems = group.items.filter(
        (item) => item.status === "ACTIVE",
      );

      if (activeItems.length === 0) return ""; // Se não tiver nada ativo no dia, nem mostra o grupo

      return `
        <div class="mt-6 border-t pt-4">
            <div class="flex justify-between items-center mb-3">
                <h3 class="font-bold text-xs text-gray-500 uppercase">${groupIndex + 2}. ${group.name}</h3>
                <span class="text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-400">
                    Min: ${group.min} / Máx: ${group.max}
                </span>
            </div>
            <div class="space-y-2">
                ${activeItems
                  .map(
                    (item, itemIndex) => `
                    <div class="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                        <div>
                            <span class="text-sm font-medium text-gray-700">${item.name}</span>
                            ${item.price > 0 ? `<span class="block text-[10px] text-gray-400">+ R$ ${item.price.toFixed(2)}</span>` : ""}
                        </div>
                        <div class="flex items-center gap-3 bg-white rounded-lg border p-1">
                            <button onclick="updateModifierQty('${groupIndex}', '${itemIndex}', -1)" class="w-7 h-7 text-red-600 font-bold">-</button>
                            <input type="number" 
                                id="mod-${groupIndex}-${itemIndex}" 
                                value="0" 
                                data-price="${item.price}" 
                                data-name="${item.name}" 
                                data-group="${group.name}"
                                data-max="${group.max}"
                                class="modifier-qty w-6 text-center text-sm font-bold border-none bg-transparent" readonly>
                            <button onclick="updateModifierQty('${groupIndex}', '${itemIndex}', 1)" class="w-7 h-7 text-red-600 font-bold">+</button>
                        </div>
                    </div>
                `,
                  )
                  .join("")}
            </div>
        </div>
      `;
    })
    .join("");

  content.innerHTML = `
        <div class="space-y-6 pb-20">
            ${product.images?.[0] ? `<img src="${product.images[0]}" class="w-full h-48 object-cover rounded-xl shadow-sm">` : ""}
            <div>
                <h2 class="text-2xl font-bold text-gray-800">${product.name}</h2>
                <p class="text-gray-500 text-sm mt-1">${product.description || ""}</p>
            </div>

            <div>
                <h3 class="font-bold text-xs text-gray-500 uppercase mb-3">1. Escolha o Tamanho</h3>
                <div class="flex gap-2">${skusHTML}</div>
            </div>

            <div id="sku-attributes-container"></div>
            
            <div id="modifiers-dynamic-container">
                ${modifiersHTML}
            </div>

            <div class="flex items-center justify-between pt-4 border-t">
                <span class="font-bold text-gray-700">Quantidade do pedido</span>
                <div class="flex items-center gap-4 bg-gray-100 rounded-xl p-1">
                    <button onclick="updateQty('main-qty', -1)" class="w-10 h-10 bg-white rounded-lg shadow-sm text-xl font-bold">-</button>
                    <input type="number" id="main-qty" value="1" class="w-8 text-center font-bold bg-transparent border-none" readonly>
                    <button onclick="updateQty('main-qty', 1)" class="w-10 h-10 bg-white rounded-lg shadow-sm text-xl font-bold">+</button>
                </div>
            </div>

            <div class="pt-4">
                <h3 class="font-bold text-xs text-gray-500 uppercase mb-2">Alguma observação?</h3>
                <textarea id="product-note" placeholder="Ex: Tirar cebola..." class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-600 outline-none resize-none" rows="3"></textarea>
            </div>
        </div>
    `;

  renderAttributes(0);
}

function updateModifierQty(groupIndex, itemIndex, delta) {
  const id = `mod-${groupIndex}-${itemIndex}`;
  const input = document.getElementById(id);
  const maxGroup = parseInt(input.dataset.max);

  // Contar quanto já foi selecionado NESSE grupo
  const groupInputs = document.querySelectorAll(`[id^="mod-${groupIndex}-"]`);
  let currentGroupTotal = 0;
  groupInputs.forEach((inp) => (currentGroupTotal += parseInt(inp.value)));

  let newVal = parseInt(input.value) + delta;

  if (newVal < 0) newVal = 0;

  // Validar se ultrapassa o máximo do grupo (ex: Max 4 acompanhamentos)
  if (delta > 0 && currentGroupTotal >= maxGroup) {
    alert(`O limite deste grupo é de ${maxGroup} itens.`);
    return;
  }

  input.value = newVal;
  if (typeof updateTotal === "function") updateTotal();
}

function renderAttributes(skuIndex) {
  const container = document.getElementById("sku-attributes-container");
  const sku = currentProduct.skus[skuIndex];

  if (!sku || !sku.attributes) {
    container.innerHTML = "";
    return;
  }

  // Pegamos todos os valores (ex: "carne", "frango") dos atributos
  const values = Object.values(sku.attributes);

  // Geramos os botões. Todos compartilham o name="selected-flavor"
  // para que o usuário só possa escolher UM.
  container.innerHTML = `
        <div class="mt-4">
            <h3 class="font-bold text-xs text-gray-500 uppercase mb-2">Escolha o Sabor</h3>
            <div class="flex flex-wrap gap-2">
                ${values
                  .map(
                    (val, i) => `
                    <label class="cursor-pointer">
                        <input type="radio" 
                               name="selected-flavor" 
                               onchange="updateTotal()"
                               value="${val}" 
                               class="peer hidden" 
                               ${i === 0 ? "checked" : ""}>
                        <div class="px-4 py-2 border rounded-full peer-checked:bg-red-600 peer-checked:text-white transition-all text-sm">
                            ${val}
                        </div>
                    </label>
                `,
                  )
                  .join("")}
            </div>
        </div>
    `;
}

function updateQty(id, delta) {
  const input = document.getElementById(id);
  let newVal = parseInt(input.value) + delta;

  if (id === "main-qty") {
    // Busca o SKU selecionado para saber o limite de estoque
    const selectedSku = document.querySelector('input[name="sku-opt"]:checked');
    const maxStock = selectedSku ? parseInt(selectedSku.dataset.stock) : 99;

    if (newVal < 1) newVal = 1;
    if (newVal > maxStock) {
      Toast.fire({
        icon: "warning",
        title: `Ops! Só temos ${maxStock} unidades em estoque.`,
      });
      newVal = maxStock;
    }
  } else {
    // Lógica para adicionais (modifiers) costuma ser livre ou limitada por regra de negócio
    if (newVal < 0) newVal = 0;
  }

  input.value = newVal;
  if (typeof updateTotal === "function") updateTotal();
}

// Função auxiliar para resetar a quantidade ao trocar de tamanho
function resetMainQty() {
  const input = document.getElementById("main-qty");
  if (input) input.value = 1;
}

/**
 * Salva o estado das mesas tanto no LocalStorage (backup rápido)
 * quanto no Banco de Dados (sincronização remota).
 */
async function saveTablesToStorage() {
  // 1. Backup imediato no navegador (evita perda se a internet oscilar)
  localStorage.setItem("prafood_tables_data", JSON.stringify(tablesData));

  // 2. Identificação da empresa (vinda da sua variável global ou config)
  const companyId = typeof storeTag !== "undefined" ? storeTag : "ADMIN-LOCAL";

  try {
    // 3. Sincronização com o Backend
    const response = await fetch(`https://prafoodapi.onrender.com/products/tables/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        companyId: companyId,
        tables: tablesData, // Envia o objeto com todas as 10 mesas
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Erro ao sincronizar com o servidor");
    }

    console.log("✅ Mesas sincronizadas no banco de dados com sucesso.");
  } catch (err) {
    // Se falhar (ex: servidor offline), o sistema continua funcionando com o LocalStorage
    console.warn("⚠️ Falha na sincronização remota:", err.message);

    // Opcional: Avisar o usuário com um toast discreto
    if (typeof Swal !== "undefined") {
      const Toast = Swal.mixin({
        toast: true,
        position: "bottom-end",
        showConfirmButton: false,
        timer: 3000,
      });
      Toast.fire({
        icon: "warning",
        title: "Modo Offline: Salvo apenas localmente",
      });
    }
  }
}

// Funções de Controle do Modal da Impressora
function openPrinterModal() {
  document.getElementById("printer-modal").classList.remove("hidden");
}

function closePrinterModal() {
  document.getElementById("printer-modal").classList.add("hidden");
}

function testPrint() {
  Swal.fire({
    title: "Imprimindo teste...",
    text: "Aguarde a saída do papel na impressora térmica.",
    icon: "info",
    timer: 2000,
    showConfirmButton: false,
    toast: true,
    position: "top-end",
  });
}

function reconnectPrinter() {
  const btn = event.target;
  btn.innerHTML = '<i class="fas fa-spinner animate-spin"></i> Conectando...';
  btn.disabled = true;

  setTimeout(() => {
    btn.innerHTML = "Reiniciar";
    btn.disabled = false;
    Swal.fire("Sucesso", "Impressora reinicializada com sucesso!", "success");
  }, 1500);
}

// Fechar modal ao clicar fora dele
window.onclick = function (event) {
  const modal = document.getElementById("printer-modal");
  if (event.target == modal) {
    closePrinterModal();
  }
};

