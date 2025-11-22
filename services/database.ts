import { Category, KnowledgeItem, User, Role } from '../types';

// --- Constants & Keys ---
const DB_KEYS = {
  ENTRIES: 'santander_kb_entries_v1',
  CATEGORIES: 'santander_kb_categories_v1',
  HEADER_COLOR: 'santander_kb_header_color_v1',
  USERS: 'santander_kb_users_v1'
};

// --- Initial Seed Data ---
const INITIAL_CATEGORIES: Category[] = [
  { id: '1', name: 'Hardware Support' },
  { id: '2', name: 'Software Installation' },
  { id: '3', name: 'Network & Connectivity' },
  { id: '4', name: 'Security Policies' },
];

const INITIAL_ENTRIES: KnowledgeItem[] = [
  {
    id: '101',
    title: 'How to configure VPN for remote access',
    content: '<ol><li>Open Cisco AnyConnect.</li><li>Enter the gateway address: <strong>vpn.santander.com</strong></li><li>Use your corporate credentials.</li><li>Approve the MFA request via the authenticator app.</li></ol><p>If you encounter connection issues, ensure your network password has not expired.</p>',
    categoryId: '3',
    authorName: 'SysAdmin',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    views: 124
  },
  {
    id: '102',
    title: 'Printer Setup (Floor 3)',
    content: '<p>The printer on Floor 3 IP address is <strong>192.168.1.50</strong>.</p><p>To install:</p><ul><li>Open File Explorer.</li><li>Navigate to <code>\\\\printserv\\floor3</code>.</li><li>Double click the printer icon to install drivers automatically.</li></ul>',
    categoryId: '1',
    authorName: 'HelpDesk',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    views: 45
  }
];

const INITIAL_USERS: User[] = [
  {
    id: 'admin-1',
    name: 'System Administrator',
    username: 'admin',
    password: '123', // In a real app, hash this!
    role: Role.ADMIN
  },
  {
    id: 'user-1',
    name: 'John Doe',
    username: 'user',
    password: '123',
    role: Role.USER
  }
];

// --- Database Service Implementation ---

const getStorage = <T>(key: string, defaultData: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultData;
  } catch (e) {
    console.error(`Error reading ${key} from storage`, e);
    return defaultData;
  }
};

const setStorage = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error writing ${key} to storage`, e);
  }
};

export const db = {
  // Initialize DB only if empty (prevents overwriting user data on refactors)
  init: () => {
    if (!localStorage.getItem(DB_KEYS.CATEGORIES)) {
      setStorage(DB_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    }
    if (!localStorage.getItem(DB_KEYS.ENTRIES)) {
      setStorage(DB_KEYS.ENTRIES, INITIAL_ENTRIES);
    }
    if (!localStorage.getItem(DB_KEYS.USERS)) {
      setStorage(DB_KEYS.USERS, INITIAL_USERS);
    }
  },

  users: {
    getAll: (): User[] => getStorage(DB_KEYS.USERS, INITIAL_USERS),
    
    add: (user: User): User[] => {
      const current = getStorage<User[]>(DB_KEYS.USERS, []);
      // Check for duplicate username
      if (current.some(u => u.username === user.username)) {
        throw new Error('Username already exists');
      }
      const updated = [...current, user];
      setStorage(DB_KEYS.USERS, updated);
      return updated;
    },

    authenticate: (username: string, password: string): User | null => {
      const users = getStorage<User[]>(DB_KEYS.USERS, []);
      return users.find(u => u.username === username && u.password === password) || null;
    }
  },

  entries: {
    getAll: (): KnowledgeItem[] => getStorage(DB_KEYS.ENTRIES, INITIAL_ENTRIES),
    
    add: (entry: KnowledgeItem): KnowledgeItem[] => {
      const current = getStorage<KnowledgeItem[]>(DB_KEYS.ENTRIES, []);
      const updated = [entry, ...current];
      setStorage(DB_KEYS.ENTRIES, updated);
      return updated;
    },

    delete: (id: string): KnowledgeItem[] => {
      // Force read from storage to ensure we have latest data
      const current = getStorage<KnowledgeItem[]>(DB_KEYS.ENTRIES, []);
      const updated = current.filter(e => String(e.id) !== String(id));
      setStorage(DB_KEYS.ENTRIES, updated);
      return updated;
    },

    update: (updatedEntry: KnowledgeItem): KnowledgeItem[] => {
      const current = getStorage<KnowledgeItem[]>(DB_KEYS.ENTRIES, []);
      const updated = current.map(e => e.id === updatedEntry.id ? updatedEntry : e);
      setStorage(DB_KEYS.ENTRIES, updated);
      return updated;
    }
  },

  categories: {
    getAll: (): Category[] => getStorage(DB_KEYS.CATEGORIES, INITIAL_CATEGORIES),
    
    add: (category: Category): Category[] => {
      const current = getStorage<Category[]>(DB_KEYS.CATEGORIES, []);
      const updated = [...current, category];
      setStorage(DB_KEYS.CATEGORIES, updated);
      return updated;
    },

    delete: (id: string): Category[] => {
      const current = getStorage<Category[]>(DB_KEYS.CATEGORIES, []);
      const updated = current.filter(c => c.id !== id);
      setStorage(DB_KEYS.CATEGORIES, updated);
      return updated;
    },

    update: (id: string, name: string): Category[] => {
      const current = getStorage<Category[]>(DB_KEYS.CATEGORIES, []);
      const updated = current.map(c => c.id === id ? { ...c, name } : c);
      setStorage(DB_KEYS.CATEGORIES, updated);
      return updated;
    }
  },

  settings: {
    getHeaderColor: (): string => {
      return localStorage.getItem(DB_KEYS.HEADER_COLOR) || '#EC0000';
    },
    setHeaderColor: (color: string) => {
      localStorage.setItem(DB_KEYS.HEADER_COLOR, color);
    }
  }
};

// Initialize on load
db.init();