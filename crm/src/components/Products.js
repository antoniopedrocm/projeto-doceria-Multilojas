import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Package,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  X,
  Save,
  Cake,
  Coffee,
  Cookie
} from 'lucide-react';

// Componentes auxiliares (mesmos do App principal)
const Modal = ({ isOpen, onClose, title, children, size = "md" }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl"
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden`}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {children}
        </div>
      </div>
    </div>
  );
};

const Button = ({ children, variant = "primary", size = "md", onClick, className = "", disabled = false, type = "button" }) => {
  const baseClasses = "font-medium rounded-xl transition-all flex items-center gap-2 justify-center";
  const variants = {
    primary: "bg-gradient-to-r from-pink-500 to-rose-600 text-white hover:from-pink-600 hover:to-rose-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5",
    secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-md hover:shadow-lg",
    danger: "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-xl",
    success: "bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-xl",
  };
  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3",
    lg: "px-8 py-4 text-lg",
  };
  
  return (
    <button 
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

const Input = ({ label, error, className = "", ...props }) => (
  <div className="space-y-1">
    {label && (
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
    )}
    <input
      {...props}
      className={`w-full px-4 py-3 border rounded-xl transition-all focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
        error ? 'border-red-300' : 'border-gray-300'
      } ${className}`}
    />
    {error && <p className="text-sm text-red-600">{error}</p>}
  </div>
);

const Select = ({ label, options, error, className = "", ...props }) => (
  <div className="space-y-1">
    {label && (
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
    )}
    <select
      {...props}
      className={`w-full px-4 py-3 border rounded-xl transition-all focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
        error ? 'border-red-300' : 'border-gray-300'
      } ${className}`}
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    {error && <p className="text-sm text-red-600">{error}</p>}
  </div>
);

const Table = ({ columns, data, actions = [] }) => (
  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
          <tr>
            {columns.map((col, index) => (
              <th key={index} className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                {col.header}
              </th>
            ))}
            {actions.length > 0 && (
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">
                Ações
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gradient-to-r hover:from-pink-50/50 hover:to-rose-50/50 transition-all">
              {columns.map((col, colIndex) => (
                <td key={colIndex} className="px-6 py-4 text-sm text-gray-900">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
              {actions.length > 0 && (
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    {actions.map((action, actionIndex) => (
                      <button
                        key={actionIndex}
                        onClick={() => action.onClick(row)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title={action.label}
                      >
                        <action.icon className="w-4 h-4 text-gray-600" />
                      </button>
                    ))}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const Card = ({ title, value, icon: Icon, color = "pink", trend }) => (
  <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all transform hover:-translate-y-1">
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 bg-gradient-to-br from-${color}-500 to-${color}-600 rounded-2xl flex items-center justify-center shadow-lg`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1">
        <p className="text-gray-500 text-sm font-medium">{title}</p>
        <h2 className="text-2xl font-bold text-gray-800">{value}</h2>
        {trend && (
          <div className="flex items-center mt-1">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-500 text-sm font-medium">+{trend}%</span>
          </div>
        )}
      </div>
    </div>
  </div>
);

// Dados iniciais dos produtos
const initialProducts = [
  { 
    id: 1, 
    nome: "Bolo de Chocolate", 
    categoria: "Bolos", 
    preco: 45.00, 
    custo: 22.50, 
    estoque: 15, 
    status: "Ativo",
    descricao: "Delicioso bolo de chocolate com cobertura cremosa",
    tempoPreparo: "2 horas"
  },
  { 
    id: 2, 
    nome: "Torta de Morango", 
    categoria: "Tortas", 
    preco: 55.00, 
    custo: 27.50, 
    estoque: 8, 
    status: "Ativo",
    descricao: "Torta fresca com morangos selecionados",
    tempoPreparo: "3 horas"
  },
  { 
    id: 3, 
    nome: "Cupcake Vanilla", 
    categoria: "Cupcakes", 
    preco: 7.50, 
    custo: 3.75, 
    estoque: 32, 
    status: "Ativo",
    descricao: "Cupcake de baunilha com cobertura colorida",
    tempoPreparo: "30 minutos"
  },
  { 
    id: 4, 
    nome: "Brigadeiro Gourmet", 
    categoria: "Doces", 
    preco: 3.50, 
    custo: 1.75, 
    estoque: 5, 
    status: "Baixo Estoque",
    descricao: "Brigadeiro artesanal com chocolate belga",
    tempoPreparo: "15 minutos"
  },
  { 
    id: 5, 
    nome: "Bolo de Cenoura", 
    categoria: "Bolos", 
    preco: 40.00, 
    custo: 20.00, 
    estoque: 12, 
    status: "Ativo",
    descricao: "Bolo caseiro de cenoura com cobertura de chocolate",
    tempoPreparo: "2.5 horas"
  },
  { 
    id: 6, 
    nome: "Torta de Limão", 
    categoria: "Tortas", 
    preco: 48.00, 
    custo: 24.00, 
    estoque: 6, 
    status: "Ativo",
    descricao: "Torta refrescante com creme de limão",
    tempoPreparo: "3 horas"
  }
];

const categorias = [
  { value: "", label: "Selecione uma categoria" },
  { value: "Bolos", label: "Bolos" },
  { value: "Tortas", label: "Tortas" },
  { value: "Cupcakes", label: "Cupcakes" },
  { value: "Doces", label: "Doces" },
  { value: "Salgados", label: "Salgados" }
];

const Products = () => {
  const [products, setProducts] = useState(initialProducts);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    nome: "",
    categoria: "",
    preco: "",
    custo: "",
    estoque: "",
    status: "Ativo",
    descricao: "",
    tempoPreparo: ""
  });

  // Filtros
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "" || product.categoria === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Estatísticas
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.status === "Ativo").length;
  const lowStockProducts = products.filter(p => p.estoque < 10).length;
  const totalValue = products.reduce((acc, p) => acc + (p.preco * p.estoque), 0);

  // Handlers
  const handleSubmit = (e) => {
    e.preventDefault();
    
    const productData = {
      ...formData,
      preco: parseFloat(formData.preco),
      custo: parseFloat(formData.custo),
      estoque: parseInt(formData.estoque)
    };

    if (editingProduct) {
      setProducts(products.map(p => 
        p.id === editingProduct.id ? { ...p, ...productData } : p
      ));
    } else {
      const newId = Math.max(...products.map(p => p.id)) + 1;
      setProducts([...products, { ...productData, id: newId }]);
    }

    resetForm();
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      nome: product.nome,
      categoria: product.categoria,
      preco: product.preco.toString(),
      custo: product.custo.toString(),
      estoque: product.estoque.toString(),
      status: product.status,
      descricao: product.descricao,
      tempoPreparo: product.tempoPreparo
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm("Tem certeza que deseja excluir este produto?")) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const resetForm = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({
      nome: "",
      categoria: "",
      preco: "",
      custo: "",
      estoque: "",
      status: "Ativo",
      descricao: "",
      tempoPreparo: ""
    });
  };

  // Colunas da tabela
  const columns = [
    {
      header: "Produto",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-md">
            {row.categoria === 'Bolos' && <Cake className="w-5 h-5 text-white" />}
            {row.categoria === 'Cupcakes' && <Cookie className="w-5 h-5 text-white" />}
            {row.categoria === 'Tortas' && <Coffee className="w-5 h-5 text-white" />}
            {!['Bolos', 'Cupcakes', 'Tortas'].includes(row.categoria) && <Package className="w-5 h-5 text-white" />}
          </div>
          <div>
            <p className="font-semibold text-gray-800">{row.nome}</p>
            <p className="text-sm text-gray-500">{row.categoria}</p>
          </div>
        </div>
      )
    },
    { 
      header: "Preço", 
      render: (row) => (
        <span className="font-semibold text-green-600">
          R$ {row.preco.toFixed(2)}
        </span>
      )
    },
    { 
      header: "Custo", 
      render: (row) => (
        <span className="text-gray-600">
          R$ {row.custo.toFixed(2)}
        </span>
      )
    },
    { 
      header: "Margem", 
      render: (row) => {
        const margin = ((row.preco - row.custo) / row.preco) * 100;
        return (
          <span className={`font-medium ${margin > 50 ? 'text-green-600' : margin > 30 ? 'text-yellow-600' : 'text-red-600'}`}>
            {margin.toFixed(1)}%
          </span>
        );
      }
    },
    { 
      header: "Estoque", 
      render: (row) => (
        <span className={`font-medium ${row.estoque < 10 ? 'text-red-600' : 'text-gray-800'}`}>
          {row.estoque} un
        </span>
      )
    },
    {
      header: "Status",
      render: (row) => (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          row.status === 'Ativo' ? 'bg-green-100 text-green-800' :
          row.status === 'Baixo Estoque' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {row.status}
        </span>
      )
    }
  ];

  const actions = [
    { icon: Eye, label: "Visualizar", onClick: (row) => console.log("Visualizar", row) },
    { icon: Edit, label: "Editar", onClick: handleEdit },
    { icon: Trash2, label: "Excluir", onClick: (row) => handleDelete(row.id) }
  ];

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-pink-50/30 to-rose-50/30 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
            Gestão de Produtos
          </h1>
          <p className="text-gray-600 mt-1">Gerencie seu cardápio e estoque</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" />
          Novo Produto
        </Button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card 
          title="Total de Produtos" 
          value={totalProducts} 
          icon={Package} 
          color="blue"
        />
        <Card 
          title="Produtos Ativos" 
          value={activeProducts} 
          icon={TrendingUp} 
          color="green"
        />
        <Card 
          title="Baixo Estoque" 
          value={lowStockProducts} 
          icon={AlertTriangle} 
          color="red"
        />
        <Card 
          title="Valor do Estoque" 
          value={`R$ ${totalValue.toFixed(2)}`} 
          icon={DollarSign} 
          color="purple"
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent shadow-md"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent shadow-md"
        >
          <option value="">Todas as categorias</option>
          <option value="Bolos">Bolos</option>
          <option value="Tortas">Tortas</option>
          <option value="Cupcakes">Cupcakes</option>
          <option value="Doces">Doces</option>
          <option value="Salgados">Salgados</option>
        </select>
        <Button variant="secondary">
          <Filter className="w-4 h-4" />
          Filtros
        </Button>
      </div>

      {/* Tabela */}
      <Table columns={columns} data={filteredProducts} actions={actions} />

      {/* Modal */}
      <Modal 
        isOpen={showModal} 
        onClose={resetForm} 
        title={editingProduct ? "Editar Produto" : "Novo Produto"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Nome do Produto"
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({...formData, nome: e.target.value})}
              required
            />
            <Select
              label="Categoria"
              options={categorias}
              value={formData.categoria}
              onChange={(e) => setFormData({...formData, categoria: e.target.value})}
              required
            />
            <Input
              label="Preço de Venda (R$)"
              type="number"
              step="0.01"
              min="0"
              value={formData.preco}
              onChange={(e) => setFormData({...formData, preco: e.target.value})}
              required
            />
            <Input
              label="Custo (R$)"
              type="number"
              step="0.01"
              min="0"
              value={formData.custo}
              onChange={(e) => setFormData({...formData, custo: e.target.value})}
              required
            />
            <Input
              label="Quantidade em Estoque"
              type="number"
              min="0"
              value={formData.estoque}
              onChange={(e) => setFormData({...formData, estoque: e.target.value})}
              required
            />
            <Input
              label="Tempo de Preparo"
              type="text"
              placeholder="Ex: 2 horas"
              value={formData.tempoPreparo}
              onChange={(e) => setFormData({...formData, tempoPreparo: e.target.value})}
            />
          </div>
          
          <Input
            label="Descrição"
            type="text"
            placeholder="Descrição detalhada do produto"
            value={formData.descricao}
            onChange={(e) => setFormData({...formData, descricao: e.target.value})}
          />

          {/* Mostrar margem de lucro em tempo real */}
          {formData.preco && formData.custo && (
            <div className="p-4 bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl">
              <p className="text-sm font-medium text-gray-700">
                Margem de Lucro: 
                <span className={`ml-2 font-bold ${
                  ((parseFloat(formData.preco) - parseFloat(formData.custo)) / parseFloat(formData.preco)) * 100 > 50 
                    ? 'text-green-600' 
                    : 'text-yellow-600'
                }`}>
                  {((parseFloat(formData.preco) - parseFloat(formData.custo)) / parseFloat(formData.preco) * 100).toFixed(1)}%
                </span>
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={resetForm}>
              Cancelar
            </Button>
            <Button type="submit">
              <Save className="w-4 h-4" />
              {editingProduct ? "Salvar Alterações" : "Criar Produto"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Products;