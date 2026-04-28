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
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-pass").value;

  try {
    // 1. Tenta o login
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Falha no login");

    // 2. AGUARDA a busca do perfil e armazena o retorno diretamente
    // Modificamos para fetchUserData retornar o usuário, em vez de depender só da global
    const user = await fetchUserData(); 

    // 3. Validação robusta
    if (!user || user.role !== "ADMIN") {
      audioAlerta.play().catch(() => {});
      Toast.fire({
        icon: "error",
        title: "Acesso Negado",
        text: "Sua conta não tem permissão de administrador.",
      });
      
      // Opcional: Desloga se o user não for ADMIN para limpar cookies intrusos
      await logout(); 
      return;
    }

    // 4. Sucesso total
    Toast.fire({
      icon: "success",
      title: "Bem-vindo, Admin!",
      timer: 2000
    });

    showDashboard();
  } catch (err) {
    Toast.fire({ icon: "error", title: err.message });
  }
});

async function fetchUserData() {
  try {
    const response = await fetch(`${API_URL}/users/me`, {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    
    if (!response.ok) return null;

    const data = await response.json();
    currentUser = data; // Mantém sua global atualizada
    return data;        // Retorna para o fluxo do login usar
  } catch (err) {
    console.error("Erro ao buscar dados do usuário:", err);
    return null;
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
