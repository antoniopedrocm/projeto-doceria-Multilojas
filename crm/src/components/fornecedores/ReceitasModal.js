import React from 'react';

const ReceitasModal = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  editingReceita,
  Modal,
  Input,
  Select,
  Textarea,
  Button,
  Save,
  categories = [],
  isAddingCategory = false,
  newCategory = '',
  setNewCategory,
  isSavingCategory = false,
  onCategoryChange,
  onStartAddCategory,
  onCancelAddCategory,
  onCreateCategory
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title={editingReceita ? 'Editar Receita' : 'Nova Receita'} size="lg">
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Nome da receita" value={formData.nome || ''} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
        <div className="space-y-1 w-full">
          <div className="flex items-center justify-between gap-2">
            <label className="block text-sm font-medium text-gray-700">Categoria</label>
            <button type="button" onClick={onStartAddCategory} className="text-xs font-semibold text-pink-600 hover:text-pink-700">
              + Nova categoria
            </button>
          </div>
          <Select value={formData.categoria || ''} onChange={onCategoryChange || ((e) => setFormData({ ...formData, categoria: e.target.value }))} required>
            <option value="">Selecione...</option>
            {categories.map((categoria) => (
              <option key={categoria} value={categoria}>{categoria}</option>
            ))}
            <option value="__add_new__">+ Adicionar nova categoria</option>
          </Select>
        </div>
        <Input label="Tempo de Preparo em minutos" type="number" min="1" value={formData.tempoPreparo || ''} onChange={(e) => setFormData({ ...formData, tempoPreparo: e.target.value })} required />
        <Input label="Rendimento" type="number" min="1" value={formData.rendimento || ''} onChange={(e) => setFormData({ ...formData, rendimento: e.target.value })} required />
        <Input label="Custo estimado" type="number" step="0.01" min="0" value={formData.custoEstimado || ''} onChange={(e) => setFormData({ ...formData, custoEstimado: e.target.value })} required />
        {isAddingCategory && (
          <div className="md:col-span-2 rounded-xl border border-pink-200 bg-pink-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-pink-700">Cadastrar nova categoria de receita</p>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-end">
              <Input label="Nova Categoria" placeholder="Digite o nome da categoria" value={newCategory} onChange={(e) => setNewCategory?.(e.target.value)} />
              <Button type="button" variant="secondary" onClick={onCancelAddCategory} disabled={isSavingCategory}>Cancelar</Button>
              <Button type="button" onClick={onCreateCategory} disabled={isSavingCategory}>{isSavingCategory ? 'Salvando...' : 'Salvar categoria'}</Button>
            </div>
            <p className="text-sm text-pink-700">A nova categoria ficará disponível automaticamente para as receitas desta loja.</p>
          </div>
        )}
      </div>
      <Textarea label="Ingredientes" rows="3" value={formData.ingredientes || ''} onChange={(e) => setFormData({ ...formData, ingredientes: e.target.value })} required />
      <Textarea label="Modo de Preparo" rows="4" value={formData.modoPreparo || ''} onChange={(e) => setFormData({ ...formData, modoPreparo: e.target.value })} required />
      <Textarea label="Observações (opcional)" rows="2" value={formData.observacoes || ''} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} />
      <div className="flex justify-end gap-3 pt-4">
        <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
        <Button type="submit"><Save className="w-4 h-4" /> Salvar</Button>
      </div>
    </form>
  </Modal>
);

export default ReceitasModal;
