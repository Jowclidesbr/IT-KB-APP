import React, { useState, useEffect, useMemo } from 'react';
import ReactQuill from 'react-quill';
import { Role, User, Category, KnowledgeItem, ViewState } from './types';
import { generateAIAnswer, generateSummary } from './services/geminiService';
import { db } from './services/database'; // Import the new Database Service
import { 
  Search, 
  Plus, 
  LogOut, 
  User as UserIcon, 
  BookOpen, 
  ChevronRight, 
  Sparkles, 
  Trash2,
  Eye,
  Folder,
  Filter,
  Calendar,
  Bot,
  Settings,
  X,
  Edit2,
  Save,
  Users,
  AlertTriangle,
  Lock,
  UserPlus
} from 'lucide-react';

// --- Helper Components ---

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }> = ({ 
  className = '', 
  variant = 'primary',
  type = 'button',
  ...props 
}) => {
  const baseStyles = "px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-santander text-white hover:bg-[#cc0000]",
    secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50",
    danger: "bg-red-100 text-red-700 hover:bg-red-200 border border-red-200",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100 border-transparent px-2 py-1"
  };
  
  return (
    <button type={type} className={`${baseStyles} ${variants[variant]} ${className}`} {...props} />
  );
};

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = '', ...props }) => (
  <input className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#EC0000] focus:border-[#EC0000] outline-none transition-shadow ${className}`} {...props} />
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className = '', ...props }) => (
  <select className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#EC0000] focus:border-[#EC0000] outline-none transition-shadow bg-white ${className}`} {...props} />
);

const Badge: React.FC<{ children: React.ReactNode, color?: string }> = ({ children }) => (
  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600 border border-gray-200">
    {children}
  </span>
);

// --- Main App Component ---

export default function App() {
  // -- State --
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('LOGIN');
  
  // Load initial state from Database Service
  const [categories, setCategories] = useState<Category[]>(db.categories.getAll());
  const [entries, setEntries] = useState<KnowledgeItem[]>(db.entries.getAll());
  const [headerColor, setHeaderColor] = useState(db.settings.getHeaderColor());

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  
  // Create Form State
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState(''); 
  const [newAuthorName, setNewAuthorName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Auth State
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<Role>(Role.USER);

  // Dashboard AI Summary State
  const [dashboardSummary, setDashboardSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Category Management State
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  // Delete Confirmation Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [entryToDeleteId, setEntryToDeleteId] = useState<string | null>(null);

  // -- Effects --
  
  // Default author to current user when entering create view
  useEffect(() => {
    if (currentView === 'CREATE' && user) {
      setNewAuthorName(user.name);
    }
  }, [currentView, user]);

  // -- Handlers --

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) {
      alert("Please enter both username and password.");
      return;
    }

    const foundUser = db.users.authenticate(loginUsername, loginPassword);
    
    if (foundUser) {
      setUser(foundUser);
      // Refresh data on login to ensure freshness
      setEntries(db.entries.getAll());
      setCategories(db.categories.getAll());
      setCurrentView('DASHBOARD');
      // Clear sensitive fields
      setLoginPassword('');
    } else {
      alert("Invalid username or password.");
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regUsername || !regPassword) {
      alert("Please fill in all fields.");
      return;
    }

    try {
      const newUser: User = {
        id: Date.now().toString(),
        name: regName,
        username: regUsername,
        password: regPassword,
        role: regRole
      };

      db.users.add(newUser);
      
      alert("Registration successful! Please login.");
      setAuthMode('LOGIN');
      // Clear form
      setRegName('');
      setRegUsername('');
      setRegPassword('');
    } catch (error: any) {
      alert(error.message || "Registration failed.");
    }
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView('LOGIN');
    setAuthMode('LOGIN');
    setLoginUsername('');
    setLoginPassword('');
    setDashboardSummary('');
    setShowCategoryManager(false);
    setShowDeleteModal(false);
  };

  const handleUpdateHeaderColor = (color: string) => {
    setHeaderColor(color);
    db.settings.setHeaderColor(color);
  };

  const handleCreateEntry = () => {
    if (!newTitle || !newContent || (!newCategoryId && !newCategoryName)) {
      alert("Please fill all fields");
      return;
    }

    let finalCatId = newCategoryId;

    // Handle new category creation on the fly
    if (newCategoryId === 'new' && newCategoryName) {
      const newCat: Category = {
        id: Date.now().toString(),
        name: newCategoryName
      };
      // Save category to DB and update state
      const updatedCats = db.categories.add(newCat);
      setCategories(updatedCats);
      finalCatId = newCat.id;
    }

    const newEntry: KnowledgeItem = {
      id: Date.now().toString(),
      title: newTitle,
      content: newContent,
      categoryId: finalCatId,
      authorName: newAuthorName || user?.name || 'Unknown',
      createdAt: new Date().toISOString(),
      views: 0
    };

    // Save entry to DB and update state
    const updatedEntries = db.entries.add(newEntry);
    setEntries(updatedEntries);
    
    // Reset Form
    setNewTitle('');
    setNewContent('');
    setNewCategoryId('');
    setNewCategoryName('');
    setNewAuthorName('');
    setCurrentView('DASHBOARD');
  };

  // Step 1: Initiate Delete (Opens Modal)
  const initiateDeleteEntry = (id: string) => {
    if (!user || user.role !== Role.ADMIN) {
      alert("Acesso negado: Apenas Administradores podem excluir registros.");
      return;
    }
    setEntryToDeleteId(id);
    setShowDeleteModal(true);
  };

  // Step 2: Confirm Delete (Executes Logic via DB Service)
  const confirmDeleteEntry = () => {
    if (!entryToDeleteId) return;

    // Use DB Service to delete. This returns the fresh list of entries.
    const updatedEntries = db.entries.delete(entryToDeleteId);
    setEntries(updatedEntries);
    
    // Reset UI
    setShowDeleteModal(false);
    setEntryToDeleteId(null);
    setSelectedEntryId(null);
    setDashboardSummary('');
    setCurrentView('DASHBOARD');
  };

  const cancelDeleteEntry = () => {
    setShowDeleteModal(false);
    setEntryToDeleteId(null);
  };

  const handleGenerateAI = async () => {
    if (!newTitle) {
      alert("Please enter a title first so the AI knows what to generate.");
      return;
    }
    setIsGenerating(true);
    const generated = await generateAIAnswer(newTitle);
    setNewContent(generated);
    setIsGenerating(false);
  };

  // --- Category Management Handlers ---

  const handleDeleteCategory = (catId: string) => {
    if (!user || user.role !== Role.ADMIN) return;

    // Check if used (Check against current state which reflects DB)
    const isUsed = entries.some(e => e.categoryId === catId);
    if (isUsed) {
      alert("Cannot delete this category because it contains knowledge base entries. Please reassign or delete the entries first.");
      return;
    }

    if (window.confirm("Are you sure you want to delete this category? This action cannot be undone.")) {
      const updatedCats = db.categories.delete(catId);
      setCategories(updatedCats);
    }
  };

  const startEditingCategory = (category: Category) => {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
  };

  const saveCategoryName = (catId: string) => {
    if (!editingCategoryName.trim()) {
      alert("Category name cannot be empty");
      return;
    }
    const updatedCats = db.categories.update(catId, editingCategoryName);
    setCategories(updatedCats);
    setEditingCategoryId(null);
    setEditingCategoryName('');
  };

  const filteredEntries = useMemo(() => {
    let result = entries;

    // 1. Search (Strip HTML for searching content)
    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      result = result.filter(e => {
        const contentText = e.content.replace(/<[^>]*>?/gm, '').toLowerCase(); 
        return e.title.toLowerCase().includes(lowerQ) || contentText.includes(lowerQ);
      });
    }

    // 2. Category Filter
    if (filterCategory) {
      result = result.filter(e => e.categoryId === filterCategory);
    }

    // 3. Date Filter
    if (filterDate) {
      const now = new Date();
      const limit = new Date();
      if (filterDate === '7') limit.setDate(now.getDate() - 7);
      if (filterDate === '30') limit.setDate(now.getDate() - 30);
      
      // Filter items created AFTER the limit date
      result = result.filter(e => new Date(e.createdAt) >= limit);
    }

    return result;
  }, [entries, searchQuery, filterCategory, filterDate]);

  // Clear summary when filters change
  useEffect(() => {
    setDashboardSummary('');
  }, [filteredEntries]);

  const handleGenerateSummary = async () => {
    if (filteredEntries.length === 0) return;
    setIsSummarizing(true);
    const titles = filteredEntries.map(e => e.title);
    const summary = await generateSummary(titles);
    setDashboardSummary(summary);
    setIsSummarizing(false);
  };

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'Uncategorized';
  
  // Get list of existing authors for dropdown
  const getAuthorsList = () => {
    const dbAuthors = db.users.getAll().map(u => u.name);
    // Combine with used author names in entries that might have been deleted users or manual entries
    const entryAuthors = entries.map(e => e.authorName);
    return Array.from(new Set([...dbAuthors, ...entryAuthors])).sort();
  };

  // -- Render Functions --

  const renderLogin = () => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 p-4">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md border-t-4 border-santander">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-santander rounded-full flex items-center justify-center text-white">
             <BookOpen size={32} title="Santander Knowledge Base" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
          {authMode === 'LOGIN' ? 'Welcome Back' : 'Create Account'}
        </h1>
        <p className="text-center text-gray-500 mb-8">
          IT Knowledge Base • Banco Santander
        </p>
        
        {authMode === 'LOGIN' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <UserIcon size={16} />
                </div>
                <Input 
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Enter username"
                  className="pl-10"
                  autoFocus
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <Lock size={16} />
                </div>
                <Input 
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter password"
                  className="pl-10"
                />
              </div>
            </div>
            
            <Button type="submit" className="w-full justify-center mt-6">
              Sign In
            </Button>
            
            <div className="mt-4 text-center">
              <span className="text-sm text-gray-500">Don't have an account? </span>
              <button 
                type="button"
                onClick={() => setAuthMode('REGISTER')} 
                className="text-sm font-medium text-santander hover:underline"
              >
                Sign up
              </button>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-center text-gray-400">
              Default credentials:<br/>
              User: <strong>admin</strong> / Pass: <strong>123</strong> (Admin)<br/>
              User: <strong>user</strong> / Pass: <strong>123</strong> (Staff)
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <Input 
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="e.g. Maria Silva"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <Input 
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                placeholder="Choose a username"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <Input 
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="Choose a password"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <Select 
                value={regRole} 
                onChange={(e) => setRegRole(e.target.value as Role)}
              >
                <option value={Role.USER}>Standard User (Read-Only)</option>
                <option value={Role.ADMIN}>Administrator (Full Access)</option>
              </Select>
            </div>

            <Button type="submit" className="w-full justify-center mt-6">
              <UserPlus size={18} /> Create Account
            </Button>

            <div className="mt-4 text-center">
              <button 
                type="button"
                onClick={() => setAuthMode('LOGIN')} 
                className="text-sm font-medium text-gray-500 hover:text-gray-800"
              >
                ← Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  const renderDeleteModal = () => (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
        <div className="p-6 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">Delete Knowledge Entry?</h3>
          <p className="text-sm text-gray-500 mb-6">
            Are you sure you want to delete this record? This action cannot be undone and the data will be permanently removed.
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="secondary" onClick={cancelDeleteEntry} className="w-full" title="Cancel deletion">
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDeleteEntry} className="w-full" title="Confirm permanent deletion">
              Delete Forever
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCategoryManager = () => (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
            <Folder size={20} className="text-santander"/> Manage Categories
          </h3>
          <button onClick={() => setShowCategoryManager(false)} className="text-gray-500 hover:text-gray-700" title="Close Manager">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
          {categories.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No categories found.</p>
          ) : (
            categories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-md hover:border-gray-300 transition-colors shadow-sm">
                {editingCategoryId === cat.id ? (
                  <div className="flex flex-1 gap-2 mr-2">
                    <Input 
                      value={editingCategoryName} 
                      onChange={(e) => setEditingCategoryName(e.target.value)}
                      className="py-1 px-2 text-sm"
                      autoFocus
                      title="Edit Category Name"
                    />
                    <Button variant="primary" onClick={() => saveCategoryName(cat.id)} className="px-2 py-1" title="Save Name">
                      <Save size={16} />
                    </Button>
                    <Button variant="secondary" onClick={() => setEditingCategoryId(null)} className="px-2 py-1" title="Cancel Editing">
                      <X size={16} />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="font-medium text-gray-700">{cat.name}</span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" onClick={() => startEditingCategory(cat)} title="Rename Category">
                        <Edit2 size={14} />
                      </Button>
                      <Button variant="ghost" onClick={() => handleDeleteCategory(cat.id)} title="Delete Category" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
        <div className="p-4 bg-gray-50 text-xs text-gray-500 border-t border-gray-200">
          Note: Categories containing active entries cannot be deleted.
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-6 relative">
      {/* Category Manager Modal */}
      {showCategoryManager && renderCategoryManager()}

      {/* Admin Customization Panel */}
      {user?.role === Role.ADMIN && (
        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex flex-wrap items-center justify-between gap-4">
           <div className="flex items-center gap-2 text-sm text-gray-700 font-medium" title="Admin Configuration">
             <Settings size={18} className="text-santander" />
             <span>Admin Controls:</span>
           </div>
           <div className="flex flex-wrap items-center gap-4">
             <div className="flex items-center gap-2 border-r border-gray-200 pr-4">
                <span className="text-xs text-gray-500">Menu Color:</span>
                <input 
                  type="color" 
                  value={headerColor}
                  onChange={(e) => handleUpdateHeaderColor(e.target.value)}
                  className="h-6 w-8 cursor-pointer border rounded bg-transparent"
                  title="Choose Header Color"
                />
                <Button 
                  variant="ghost" 
                  onClick={() => handleUpdateHeaderColor('#EC0000')} 
                  className="text-xs py-0.5 h-6"
                  title="Reset to Santander Red"
                >
                  Reset
                </Button>
             </div>
             <Button 
               variant="secondary" 
               onClick={() => setShowCategoryManager(true)}
               className="text-xs py-1 h-8"
               title="Open Category Manager"
             >
               <Folder size={14} /> Manage Categories
             </Button>
           </div>
        </div>
      )}

      {/* Header & Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Knowledge Base</h2>
          <p className="text-gray-500">Access technical documentation and solutions.</p>
        </div>
        
        {/* Only ADMIN can create entries */}
        {user?.role === Role.ADMIN && (
          <Button onClick={() => setCurrentView('CREATE')} title="Create New Knowledge Base Entry">
            <Plus size={18} />
            New Entry
          </Button>
        )}
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 sticky top-0 z-10 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <Input 
            placeholder="Search for solutions, error codes, or guides..." 
            className="pl-10 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            title="Search articles"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
             <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
               <Filter size={16} />
             </div>
             <Select 
               className="pl-10 py-1.5 text-sm" 
               value={filterCategory}
               onChange={(e) => setFilterCategory(e.target.value)}
               title="Filter by Category"
             >
               <option value="">All Categories</option>
               {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
             </Select>
          </div>

          <div className="relative flex-1">
             <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
               <Calendar size={16} />
             </div>
             <Select 
               className="pl-10 py-1.5 text-sm"
               value={filterDate}
               onChange={(e) => setFilterDate(e.target.value)}
               title="Filter by Date"
             >
               <option value="">Any Time</option>
               <option value="7">Last 7 Days</option>
               <option value="30">Last 30 Days</option>
             </Select>
          </div>
        </div>
      </div>

      {/* AI Dashboard Summary Section */}
      <div className="bg-gradient-to-r from-gray-50 to-white p-4 rounded-lg border border-gray-200">
        {!dashboardSummary && (
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-2 text-gray-600">
               <Bot size={20} className="text-santander" />
               <span className="text-sm font-medium">Get a quick overview of these {filteredEntries.length} results with AI</span>
             </div>
             <Button 
               variant="secondary" 
               className="text-xs py-1.5" 
               onClick={handleGenerateSummary}
               disabled={isSummarizing || filteredEntries.length === 0}
               title="Generate AI Summary of current results"
             >
               {isSummarizing ? (
                 <>
                   <span className="animate-spin h-3 w-3 border-2 border-gray-500 border-t-transparent rounded-full"></span>
                   Analyzing...
                 </>
               ) : (
                 <>
                   <Sparkles size={14} className="text-santander" />
                   Summarize Results
                 </>
               )}
             </Button>
          </div>
        )}

        {dashboardSummary && (
          <div className="animate-in fade-in duration-500">
             <div className="flex items-start gap-3">
                <div className="mt-1 bg-red-50 p-1.5 rounded-md">
                   <Sparkles size={16} className="text-santander" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-800 mb-1">Quick Summary</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{dashboardSummary}</p>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Entries Grid */}
      <div className="grid grid-cols-1 gap-4">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-500">
              No entries found 
              {searchQuery && ` matching "${searchQuery}"`}
              {(filterCategory || filterDate) && ' with current filters'}.
            </p>
          </div>
        ) : (
          filteredEntries.map(entry => (
            <div 
              key={entry.id} 
              onClick={() => { setSelectedEntryId(entry.id); setCurrentView('DETAILS'); }}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-red-200 transition-all cursor-pointer group"
              title="View details"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-gray-800 group-hover:text-santander transition-colors">
                  {entry.title}
                </h3>
                <ChevronRight className="text-gray-300 group-hover:text-santander" size={20} />
              </div>
              <p className="text-gray-600 mb-4 line-clamp-2 text-sm">
                {/* Strip HTML for preview */}
                {entry.content.replace(/<[^>]*>?/gm, ' ')}
              </p>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <Badge>{getCategoryName(entry.categoryId)}</Badge>
                <span className="flex items-center gap-1"><UserIcon size={12} /> {entry.authorName}</span>
                <span className="flex items-center gap-1"><Eye size={12} /> {entry.views} views</span>
                <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderCreate = () => (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-md border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Create Knowledge Entry</h2>
      
      <div className="space-y-6">
        {/* Author Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
               <Users size={16} />
            </div>
            <Select
              value={newAuthorName}
              onChange={(e) => setNewAuthorName(e.target.value)}
              className="pl-10"
              title="Select Author"
            >
              <option value="">Select an author...</option>
              {getAuthorsList().map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
              {/* Ensure current user is an option if not in list */}
              {user && !getAuthorsList().includes(user.name) && (
                 <option value={user.name}>{user.name}</option>
              )}
            </Select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <Select 
            value={newCategoryId} 
            onChange={(e) => {
              setNewCategoryId(e.target.value);
              if (e.target.value !== 'new') setNewCategoryName('');
            }}
            title="Select or Create Category"
          >
            <option value="">Select a category...</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option value="new">+ Create New Category</option>
          </Select>
          
          {newCategoryId === 'new' && (
            <div className="mt-2 animate-in fade-in slide-in-from-top-2">
              <Input 
                placeholder="Enter new category name" 
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                title="New Category Name"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title / Question</label>
          <Input 
            placeholder="e.g., How to reset SAP password" 
            value={newTitle} 
            onChange={(e) => setNewTitle(e.target.value)}
            title="Entry Title"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-gray-700">Solution / Content</label>
            <button 
              onClick={handleGenerateAI}
              disabled={isGenerating}
              className="text-xs flex items-center gap-1 text-santander font-medium hover:underline disabled:opacity-50"
              title="Auto-generate content based on title"
            >
              <Sparkles size={14} />
              {isGenerating ? 'Thinking...' : 'Generate with Gemini AI'}
            </button>
          </div>
          
          <div className="mb-2">
             <ReactQuill 
                theme="snow"
                value={newContent}
                onChange={setNewContent}
                placeholder="Write your detailed solution here..."
                className="h-64"
             />
             {/* Spacing to accommodate the editor expanding or absolute toolbars if any */}
             <div className="h-12 md:h-16"></div>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <Button onClick={handleCreateEntry} disabled={isGenerating} title="Save new entry">
            Save Entry
          </Button>
          <Button variant="secondary" onClick={() => setCurrentView('DASHBOARD')} title="Cancel creation">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );

  const renderDetails = () => {
    const entry = entries.find(e => e.id === selectedEntryId);
    if (!entry) return <div>Entry not found</div>;

    return (
      <div className="max-w-4xl mx-auto">
        <Button variant="secondary" onClick={() => setCurrentView('DASHBOARD')} className="mb-6" title="Return to Dashboard">
          ← Back to List
        </Button>

        <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200 relative">
          {user?.role === Role.ADMIN && (
            <div className="absolute top-8 right-8">
              <Button 
                variant="danger" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  initiateDeleteEntry(entry.id);
                }}
                title="Permanently delete this entry"
              >
                <Trash2 size={16} /> Delete
              </Button>
            </div>
          )}

          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Badge>{getCategoryName(entry.categoryId)}</Badge>
              <span className="text-sm text-gray-500">{new Date(entry.createdAt).toLocaleDateString()}</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{entry.title}</h1>
            
            <div className="flex items-center gap-2 text-sm text-gray-500 border-b border-gray-100 pb-6 mb-6">
              <span className="flex items-center gap-1"><UserIcon size={14} /> {entry.authorName}</span>
              <span className="mx-2">•</span>
              <span className="flex items-center gap-1"><Eye size={14} /> {entry.views} views</span>
            </div>
            
            <div 
              className="prose prose-red max-w-none text-gray-700 ql-editor p-0"
              dangerouslySetInnerHTML={{ __html: entry.content }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-12 font-sans">
      {currentView === 'LOGIN' && renderLogin()}
      
      {currentView !== 'LOGIN' && (
        <>
          {/* Modals */}
          {showDeleteModal && renderDeleteModal()}
          
          {/* Navbar */}
          <nav 
            style={{ backgroundColor: headerColor }}
            className="text-white shadow-md mb-8 transition-colors duration-300"
          >
            <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
              <div className="flex items-center gap-2 font-bold text-lg cursor-pointer" onClick={() => setCurrentView('DASHBOARD')} title="Go to Dashboard">
                <BookOpen /> Santander IT-KB
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm bg-black/20 px-3 py-1 rounded-full" title="Current User">
                  <UserIcon size={14} />
                  {user?.name} ({user?.role})
                </div>
                <button onClick={handleLogout} className="hover:text-white/80 transition-colors" title="Log Out">
                  <LogOut size={20} />
                </button>
              </div>
            </div>
          </nav>

          <main className="max-w-7xl mx-auto px-4">
            {currentView === 'DASHBOARD' && renderDashboard()}
            {currentView === 'CREATE' && renderCreate()}
            {currentView === 'DETAILS' && renderDetails()}
          </main>
        </>
      )}
    </div>
  );
}