import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import dns from 'dns';
import { fileURLToPath } from 'url';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose, { Schema, Types } from 'mongoose';
import 'dotenv/config';

// Force Node.js to use public DNS servers (Google 8.8.8.8 and Cloudflare 1.1.1.1)
// This resolves the home router 'querySrv ECONNREFUSED' issue when connecting to MongoDB Atlas!
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch {
  // If not supported by current environment, proceed normally
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'budgetsmart_super_secret_jwt_key_2026';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// -------------------------------------------------------------
// Database Layer: MongoDB Atlas with Persistent Local Disk Store
// -------------------------------------------------------------
let isMongoConnected = false;

// Ensure persistent local data directory exists
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch {}
}

function loadMap<T>(filename: string): Map<string, T> {
  const map = new Map<string, T>();
  try {
    const file = path.join(DATA_DIR, filename);
    if (fs.existsSync(file)) {
      const parsed: [string, T][] = JSON.parse(fs.readFileSync(file, 'utf-8'));
      if (Array.isArray(parsed)) {
        for (const [k, v] of parsed) {
          map.set(k, v);
        }
      }
    }
  } catch (err: any) {
    console.warn(`Could not load ${filename}:`, err.message);
  }
  return map;
}

function saveMap<T>(filename: string, map: Map<string, T>): void {
  try {
    const file = path.join(DATA_DIR, filename);
    fs.writeFileSync(file, JSON.stringify(Array.from(map.entries()), null, 2), 'utf-8');
  } catch (err: any) {
    console.warn(`Could not save ${filename}:`, err.message);
  }
}

interface IUserDoc {
  _id: string;
  email: string;
  passwordHash: string;
}

interface ICategoryDoc {
  _id: string;
  userId: string;
  name_he: string;
  name_en: string;
  icon: string;
  color: string;
  budgetLimit?: number;
  validFromMonth?: string;   // YYYY-MM, inclusive start ("0000-01" = always)
  invalidFromMonth?: string; // YYYY-MM, category is hidden from this month onwards (null = still valid)
}

interface IExpenseDoc {
  _id: string;
  userId: string;
  categoryId: string;
  amount: number;
  date: string; // ISO date YYYY-MM-DD
  note?: string;
  paidBy?: string; // who recorded / paid this expense
}

interface IMonthlyBudgetDoc {
  _id: string;
  userId: string;
  year: number;
  month: number;
  planned: number;
  spent: number;
}

// Persistent Store: Saved safely to disk in ./data folder so data persists across restarts!
const memoryStore = {
  users: loadMap<IUserDoc>('users.json'),
  categories: loadMap<ICategoryDoc>('categories.json'),
  expenses: loadMap<IExpenseDoc>('expenses.json'),
  monthlyBudgets: loadMap<IMonthlyBudgetDoc>('monthlyBudgets.json'),
  saveUsers: () => saveMap('users.json', memoryStore.users),
  saveCategories: () => saveMap('categories.json', memoryStore.categories),
  saveExpenses: () => saveMap('expenses.json', memoryStore.expenses),
  saveBudgets: () => saveMap('monthlyBudgets.json', memoryStore.monthlyBudgets),
};

// Mongoose Models definition
const UserSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
});

const CategorySchema = new Schema({
  userId: { type: String, required: true, index: true },
  name_he: { type: String, required: true },
  name_en: { type: String, required: true },
  icon: { type: String, default: '🏷️' },
  color: { type: String, default: '#3b82f6' },
  budgetLimit: { type: Number, default: 0 },
  validFromMonth: { type: String, default: '0000-01' },
  invalidFromMonth: { type: String, default: null },
});

const ExpenseSchema = new Schema({
  userId: { type: String, required: true, index: true },
  categoryId: { type: String, required: true, index: true },
  amount: { type: Number, required: true, min: 0 },
  date: { type: String, required: true, index: true },
  note: { type: String, default: '' },
  paidBy: { type: String, default: '' },
});

const MonthlyBudgetSchema = new Schema({
  userId: { type: String, required: true, index: true },
  year: { type: Number, required: true },
  month: { type: Number, required: true },
  planned: { type: Number, default: 0 },
  spent: { type: Number, default: 0 },
});
MonthlyBudgetSchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });

const UserModel = mongoose.model('User', UserSchema);
const CategoryModel = mongoose.model('Category', CategorySchema);
const ExpenseModel = mongoose.model('Expense', ExpenseSchema);
const MonthlyBudgetModel = mongoose.model('MonthlyBudget', MonthlyBudgetSchema);

// Attempt MongoDB Atlas connection if URI is configured
const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI && !MONGODB_URI.includes('username:password') && !MONGODB_URI.includes('<USER>') && !MONGODB_URI.includes('<db_username>')) {
  console.log('Connecting to MongoDB Atlas...');
  mongoose
    .connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000, family: 4 })
    .then(() => {
      isMongoConnected = true;
      console.log('✅ Connected to MongoDB Atlas successfully!');
    })
    .catch((err) => {
      console.warn('⚠️ MongoDB Atlas connection error:', err.message);
      console.log('💾 Using Persistent Local Database (./data) - your data is safely saved to disk!');
      isMongoConnected = false;
    });
} else {
  console.log('💾 Using Persistent Local Database (./data) - your data is safely saved to disk!');
}

// Default initial categories seeded for each user
const DEFAULT_CATEGORIES = [
  { name_he: 'מזון וסופרמרקט', name_en: 'Food & Groceries', icon: '🛒', color: '#10b981', budgetLimit: 2000 },
  { name_he: 'דיור וחשבונות', name_en: 'Housing & Utilities', icon: '🏠', color: '#3b82f6', budgetLimit: 3000 },
  { name_he: 'תחבורה ורכב', name_en: 'Transportation', icon: '🚗', color: '#f59e0b', budgetLimit: 800 },
  { name_he: 'בילויים ומסעדות', name_en: 'Dining & Leisure', icon: '🍔', color: '#ec4899', budgetLimit: 600 },
  { name_he: 'קניות וביגוד', name_en: 'Shopping', icon: '🛍️', color: '#8b5cf6', budgetLimit: 500 },
  { name_he: 'בריאות וכושר', name_en: 'Health & Wellness', icon: '💊', color: '#ef4444', budgetLimit: 400 },
  { name_he: 'חינוך והעשרה', name_en: 'Education', icon: '📚', color: '#06b6d4', budgetLimit: 300 },
  { name_he: 'שונות', name_en: 'Miscellaneous', icon: '🏷️', color: '#6b7280', budgetLimit: 200 },
];

async function seedDefaultCategories(userId: string) {
  if (isMongoConnected) {
    const existing = await CategoryModel.countDocuments({ userId });
    if (existing === 0) {
      await CategoryModel.insertMany(DEFAULT_CATEGORIES.map((c) => ({ ...c, userId })));
    }
  } else {
    const userCats = Array.from(memoryStore.categories.values()).filter((c) => c.userId === userId);
    if (userCats.length === 0) {
      for (const cat of DEFAULT_CATEGORIES) {
        const id = new Types.ObjectId().toString();
        memoryStore.categories.set(id, { _id: id, userId, validFromMonth: '0000-01', ...cat });
      }
      memoryStore.saveCategories();
    }
  }
}

// Returns categories valid for a given YYYY-MM month string
function filterCategoriesForMonth(cats: ICategoryDoc[], month: string): ICategoryDoc[] {
  return cats.filter((c) => {
    const vfm = c.validFromMonth || '0000-01';
    const ifm = c.invalidFromMonth;
    return vfm <= month && (!ifm || ifm > month);
  });
}

// Calculate the sum of budget limits for categories valid in a given month
async function getCategoryBudgetSum(userId: string, month: string): Promise<number> {
  let cats: ICategoryDoc[] = [];
  if (isMongoConnected) {
    cats = (await CategoryModel.find({ userId }).lean()) as any as ICategoryDoc[];
  } else {
    cats = Array.from(memoryStore.categories.values()).filter((c) => c.userId === userId);
  }
  return filterCategoriesForMonth(cats, month).reduce((sum, c) => sum + (c.budgetLimit || 0), 0);
}

// -------------------------------------------------------------
// Authentication Middleware
// -------------------------------------------------------------
export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired authentication token' });
    return;
  }
}

// -------------------------------------------------------------
// Authentication Routes
// -------------------------------------------------------------

// POST /auth/register
app.post('/auth/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@') || password.length < 6) {
      res.status(400).json({ error: 'Invalid email or password too short (minimum 6 characters)' });
      return;
    }

    let existingUser: any = null;
    if (isMongoConnected) {
      existingUser = await UserModel.findOne({ email: cleanEmail });
    } else {
      existingUser = Array.from(memoryStore.users.values()).find((u) => u.email === cleanEmail);
    }

    if (existingUser) {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    let userId = '';

    if (isMongoConnected) {
      const newUser = await UserModel.create({ email: cleanEmail, passwordHash });
      userId = newUser._id.toString();
    } else {
      userId = new Types.ObjectId().toString();
      memoryStore.users.set(userId, { _id: userId, email: cleanEmail, passwordHash });
      memoryStore.saveUsers();
    }

    await seedDefaultCategories(userId);

    const token = jwt.sign({ userId, email: cleanEmail }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({
      token,
      user: { _id: userId, email: cleanEmail },
      message: 'User registered successfully',
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to register user: ' + err.message });
  }
});

// POST /auth/login
app.post('/auth/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    let user: any = null;

    if (isMongoConnected) {
      user = await UserModel.findOne({ email: cleanEmail });
    } else {
      user = Array.from(memoryStore.users.values()).find((u) => u.email === cleanEmail);
    }

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const userId = user._id.toString();
    const token = jwt.sign({ userId, email: cleanEmail }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: { _id: userId, email: cleanEmail },
      message: 'Login successful',
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to log in: ' + err.message });
  }
});

// GET /auth/me
app.get('/auth/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  res.json({ user: { _id: req.userId, email: req.userEmail } });
});

// -------------------------------------------------------------
// Categories Routes
// -------------------------------------------------------------

// GET /categories?month=YYYY-MM
app.get('/categories', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    await seedDefaultCategories(userId);
    const { month } = req.query;

    let categories: ICategoryDoc[] = [];
    if (isMongoConnected) {
      categories = (await CategoryModel.find({ userId }).lean()) as any as ICategoryDoc[];
    } else {
      categories = Array.from(memoryStore.categories.values()).filter((c) => c.userId === userId);
    }

    if (month && typeof month === 'string') {
      categories = filterCategoriesForMonth(categories, month);
    } else {
      // Default: hide soft-deleted categories
      categories = categories.filter((c) => !c.invalidFromMonth);
    }

    res.json(categories);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch categories: ' + err.message });
  }
});

// POST /categories?month=YYYY-MM
app.post('/categories', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { name_he, name_en, icon, color, budgetLimit } = req.body;
    const month = req.query.month as string | undefined;

    if (!name_he || !name_en) {
      res.status(400).json({ error: 'Both Hebrew and English category names are required' });
      return;
    }

    const finalIcon = icon || '🏷️';
    const finalColor = color || '#3b82f6';
    const finalBudgetLimit = budgetLimit !== undefined ? Math.max(0, parseFloat(budgetLimit) || 0) : 0;
    const validFromMonth = month || '0000-01';

    if (isMongoConnected) {
      const created = await CategoryModel.create({
        userId,
        name_he: name_he.trim(),
        name_en: name_en.trim(),
        icon: finalIcon,
        color: finalColor,
        budgetLimit: finalBudgetLimit,
        validFromMonth,
      });
      res.status(201).json(created);
    } else {
      const _id = new Types.ObjectId().toString();
      const newCat: ICategoryDoc = {
        _id,
        userId,
        name_he: name_he.trim(),
        name_en: name_en.trim(),
        icon: finalIcon,
        color: finalColor,
        budgetLimit: finalBudgetLimit,
        validFromMonth,
      };
      memoryStore.categories.set(_id, newCat);
      memoryStore.saveCategories();
      res.status(201).json(newCat);
    }
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create category: ' + err.message });
  }
});

// PUT /categories/:id?month=YYYY-MM
// With ?month: forward-only change (invalidate old version, create new from that month)
// Without ?month: in-place global update (backward compat)
app.put('/categories/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { name_he, name_en, icon, color, budgetLimit } = req.body;
    const month = req.query.month as string | undefined;
    const numBudgetLimit = budgetLimit !== undefined ? Math.max(0, parseFloat(budgetLimit) || 0) : undefined;

    if (isMongoConnected) {
      const existing: any = await CategoryModel.findOne({ _id: id, userId }).lean();
      if (!existing) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }

      if (month && existing.validFromMonth !== month) {
        // Forward-only: invalidate current version, create new version from this month
        await CategoryModel.findOneAndUpdate({ _id: id, userId }, { invalidFromMonth: month });
        const newCat = await CategoryModel.create({
          userId,
          name_he: name_he ? name_he.trim() : existing.name_he,
          name_en: name_en ? name_en.trim() : existing.name_en,
          icon: icon || existing.icon,
          color: color || existing.color,
          budgetLimit: numBudgetLimit !== undefined ? numBudgetLimit : (existing.budgetLimit || 0),
          validFromMonth: month,
        });
        res.json(newCat);
      } else {
        const updated = await CategoryModel.findOneAndUpdate(
          { _id: id, userId },
          {
            ...(name_he && { name_he: name_he.trim() }),
            ...(name_en && { name_en: name_en.trim() }),
            ...(icon && { icon }),
            ...(color && { color }),
            ...(numBudgetLimit !== undefined && { budgetLimit: numBudgetLimit }),
          },
          { new: true }
        );
        res.json(updated);
      }
    } else {
      const cat = memoryStore.categories.get(id);
      if (!cat || cat.userId !== userId) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }

      if (month && cat.validFromMonth !== month) {
        // Forward-only: soft-invalidate old, create new version
        cat.invalidFromMonth = month;
        memoryStore.categories.set(id, cat);

        const newId = new Types.ObjectId().toString();
        const newCat: ICategoryDoc = {
          _id: newId,
          userId,
          name_he: name_he ? name_he.trim() : cat.name_he,
          name_en: name_en ? name_en.trim() : cat.name_en,
          icon: icon || cat.icon,
          color: color || cat.color,
          budgetLimit: numBudgetLimit !== undefined ? numBudgetLimit : (cat.budgetLimit || 0),
          validFromMonth: month,
        };
        memoryStore.categories.set(newId, newCat);
        memoryStore.saveCategories();
        res.json(newCat);
      } else {
        if (name_he) cat.name_he = name_he.trim();
        if (name_en) cat.name_en = name_en.trim();
        if (icon) cat.icon = icon;
        if (color) cat.color = color;
        if (numBudgetLimit !== undefined) cat.budgetLimit = numBudgetLimit;
        memoryStore.categories.set(id, cat);
        memoryStore.saveCategories();
        res.json(cat);
      }
    }
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update category: ' + err.message });
  }
});

// DELETE /categories/:id?month=YYYY-MM
// With ?month: forward-only soft delete (set invalidFromMonth) unless category started in this month
// Without ?month: hard delete
app.delete('/categories/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const month = req.query.month as string | undefined;

    if (isMongoConnected) {
      if (month) {
        const cat: any = await CategoryModel.findOne({ _id: id, userId }).lean();
        if (!cat) {
          res.status(404).json({ error: 'Category not found' });
          return;
        }
        if (cat.validFromMonth && cat.validFromMonth >= month) {
          // Category was created in this month or later – safe to hard delete
          await CategoryModel.findOneAndDelete({ _id: id, userId });
        } else {
          // Soft delete: hide from this month onwards
          await CategoryModel.findOneAndUpdate({ _id: id, userId }, { invalidFromMonth: month });
        }
      } else {
        const result = await CategoryModel.findOneAndDelete({ _id: id, userId });
        if (!result) {
          res.status(404).json({ error: 'Category not found' });
          return;
        }
      }
    } else {
      const cat = memoryStore.categories.get(id);
      if (!cat || cat.userId !== userId) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }
      if (month) {
        if (cat.validFromMonth && cat.validFromMonth >= month) {
          memoryStore.categories.delete(id);
        } else {
          cat.invalidFromMonth = month;
          memoryStore.categories.set(id, cat);
        }
      } else {
        memoryStore.categories.delete(id);
      }
      memoryStore.saveCategories();
    }

    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete category: ' + err.message });
  }
});

// -------------------------------------------------------------
// Expenses Routes
// -------------------------------------------------------------

// Helper to calculate total spent in a month
async function getMonthlySpent(userId: string, year: number, month: number): Promise<number> {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  if (isMongoConnected) {
    const results = await ExpenseModel.aggregate([
      { $match: { userId, date: { $regex: `^${monthStr}` } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return results[0]?.total || 0;
  } else {
    return Array.from(memoryStore.expenses.values())
      .filter((e) => e.userId === userId && e.date.startsWith(monthStr))
      .reduce((sum, e) => sum + e.amount, 0);
  }
}

// GET /expenses
app.get('/expenses', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { month, categoryId } = req.query;

    let allExpenses: any[] = [];
    let allCategories: any[] = [];

    if (isMongoConnected) {
      const query: any = { userId };
      if (month && typeof month === 'string') {
        query.date = { $regex: `^${month}` };
      }
      if (categoryId && typeof categoryId === 'string') {
        query.categoryId = categoryId;
      }
      allExpenses = await ExpenseModel.find(query).sort({ date: -1, _id: -1 }).lean();
      allCategories = await CategoryModel.find({ userId }).lean();
    } else {
      allCategories = Array.from(memoryStore.categories.values()).filter((c) => c.userId === userId);
      allExpenses = Array.from(memoryStore.expenses.values())
        .filter((e) => {
          if (e.userId !== userId) return false;
          if (month && typeof month === 'string' && !e.date.startsWith(month)) return false;
          if (categoryId && typeof categoryId === 'string' && e.categoryId !== categoryId) return false;
          return true;
        })
        .sort((a, b) => b.date.localeCompare(a.date));
    }

    const catMap = new Map(allCategories.map((c) => [c._id.toString(), c]));

    const populatedExpenses = allExpenses.map((exp) => {
      const cat = catMap.get(exp.categoryId?.toString());
      return {
        ...exp,
        category: cat || {
          _id: exp.categoryId,
          name_he: 'אחר',
          name_en: 'Other',
          icon: '🏷️',
          color: '#6b7280',
        },
      };
    });

    res.json(populatedExpenses);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch expenses: ' + err.message });
  }
});

// POST /expenses
app.post('/expenses', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { categoryId, amount, date, note, paidBy } = req.body;

    if (!categoryId || amount === undefined || amount === null || !date) {
      res.status(400).json({ error: 'Category, amount, and date are required' });
      return;
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({ error: 'Amount must be a positive number' });
      return;
    }

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(date)) {
      res.status(400).json({ error: 'Date must be formatted as YYYY-MM-DD' });
      return;
    }

    let createdExpense: any = null;
    let categoryDetails: any = null;

    if (isMongoConnected) {
      categoryDetails = await CategoryModel.findOne({ _id: categoryId, userId }).lean();
      if (!categoryDetails) {
        res.status(400).json({ error: 'Invalid category selected' });
        return;
      }

      createdExpense = await ExpenseModel.create({
        userId,
        categoryId,
        amount: numAmount,
        date,
        note: note ? String(note).trim() : '',
        paidBy: paidBy ? String(paidBy).trim() : '',
      });
    } else {
      categoryDetails = memoryStore.categories.get(categoryId);
      if (!categoryDetails || categoryDetails.userId !== userId) {
        res.status(400).json({ error: 'Invalid category selected' });
        return;
      }

      const _id = new Types.ObjectId().toString();
      createdExpense = {
        _id,
        userId,
        categoryId,
        amount: numAmount,
        date,
        note: note ? String(note).trim() : '',
        paidBy: paidBy ? String(paidBy).trim() : '',
      };
      memoryStore.expenses.set(_id, createdExpense);
      memoryStore.saveExpenses();
    }

    // Update monthly budget spent cache
    const [yearStr, monthStr] = date.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const spent = await getMonthlySpent(userId, year, month);

    if (isMongoConnected) {
      await MonthlyBudgetModel.findOneAndUpdate(
        { userId, year, month },
        { spent },
        { upsert: true, setDefaultsOnInsert: true }
      );
    } else {
      const budgetKey = `${userId}_${year}_${month}`;
      const existing = memoryStore.monthlyBudgets.get(budgetKey);
      if (existing) {
        existing.spent = spent;
      } else {
        memoryStore.monthlyBudgets.set(budgetKey, {
          _id: new Types.ObjectId().toString(),
          userId,
          year,
          month,
          planned: 0,
          spent,
        });
      }
      memoryStore.saveBudgets();
    }

    res.status(201).json({
      ...createdExpense.toObject ? createdExpense.toObject() : createdExpense,
      category: categoryDetails,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record expense: ' + err.message });
  }
});

// GET /expenses/recent-writers – returns last 5 unique paidBy values for autofill
app.get('/expenses/recent-writers', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    let writers: string[] = [];

    if (isMongoConnected) {
      const results = await ExpenseModel.find({ userId, paidBy: { $nin: ['', null] } })
        .sort({ _id: -1 })
        .limit(50)
        .lean();
      const seen = new Set<string>();
      for (const r of results as any[]) {
        if (r.paidBy && !seen.has(r.paidBy)) {
          seen.add(r.paidBy);
          writers.push(r.paidBy);
          if (writers.length >= 5) break;
        }
      }
    } else {
      const all = Array.from(memoryStore.expenses.values())
        .filter((e) => e.userId === userId && e.paidBy)
        .sort((a, b) => b.date.localeCompare(a.date));
      const seen = new Set<string>();
      for (const e of all) {
        if (e.paidBy && !seen.has(e.paidBy)) {
          seen.add(e.paidBy);
          writers.push(e.paidBy);
          if (writers.length >= 5) break;
        }
      }
    }

    res.json({ writers });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch recent writers: ' + err.message });
  }
});

// PUT /expenses/:id – edit an existing expense
app.put('/expenses/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { categoryId, amount, date, note, paidBy } = req.body;

    const numAmount = amount !== undefined ? Number(amount) : undefined;
    if (numAmount !== undefined && (isNaN(numAmount) || numAmount <= 0)) {
      res.status(400).json({ error: 'Amount must be a positive number' });
      return;
    }

    if (date) {
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(date)) {
        res.status(400).json({ error: 'Date must be formatted as YYYY-MM-DD' });
        return;
      }
    }

    let updatedExpense: any = null;
    let oldDate: string | null = null;

    if (isMongoConnected) {
      const existing: any = await ExpenseModel.findOne({ _id: id, userId }).lean();
      if (!existing) {
        res.status(404).json({ error: 'Expense not found' });
        return;
      }
      oldDate = existing.date;

      const update: any = {};
      if (categoryId) update.categoryId = categoryId;
      if (numAmount !== undefined) update.amount = numAmount;
      if (date) update.date = date;
      if (note !== undefined) update.note = String(note).trim();
      if (paidBy !== undefined) update.paidBy = String(paidBy).trim();

      updatedExpense = await ExpenseModel.findOneAndUpdate({ _id: id, userId }, update, { new: true }).lean();
    } else {
      const exp = memoryStore.expenses.get(id);
      if (!exp || exp.userId !== userId) {
        res.status(404).json({ error: 'Expense not found' });
        return;
      }
      oldDate = exp.date;
      if (categoryId) exp.categoryId = categoryId;
      if (numAmount !== undefined) exp.amount = numAmount;
      if (date) exp.date = date;
      if (note !== undefined) exp.note = String(note).trim();
      if (paidBy !== undefined) exp.paidBy = String(paidBy).trim();
      memoryStore.expenses.set(id, exp);
      memoryStore.saveExpenses();
      updatedExpense = exp;
    }

    // Refresh budget spent for affected months
    const affectedDates = new Set<string>();
    const finalDate = date || oldDate!;
    affectedDates.add(finalDate.substring(0, 7));
    if (oldDate) affectedDates.add(oldDate.substring(0, 7));

    for (const ym of affectedDates) {
      const [yStr, mStr] = ym.split('-');
      const yr = parseInt(yStr, 10);
      const mn = parseInt(mStr, 10);
      const spent = await getMonthlySpent(userId, yr, mn);
      if (isMongoConnected) {
        await MonthlyBudgetModel.findOneAndUpdate({ userId, year: yr, month: mn }, { spent });
      } else {
        const bk = `${userId}_${yr}_${mn}`;
        const b = memoryStore.monthlyBudgets.get(bk);
        if (b) { b.spent = spent; memoryStore.saveBudgets(); }
      }
    }

    // Populate category on response
    let categoryDetails: any = null;
    const catId = updatedExpense.categoryId;
    if (isMongoConnected) {
      categoryDetails = await CategoryModel.findOne({ _id: catId }).lean();
    } else {
      categoryDetails = memoryStore.categories.get(catId);
    }

    res.json({
      ...(updatedExpense.toObject ? updatedExpense.toObject() : updatedExpense),
      category: categoryDetails || { _id: catId, name_he: 'אחר', name_en: 'Other', icon: '🏷️', color: '#6b7280' },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update expense: ' + err.message });
  }
});

// DELETE /expenses/:id
app.delete('/expenses/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    let deletedExpense: any = null;

    if (isMongoConnected) {
      deletedExpense = await ExpenseModel.findOneAndDelete({ _id: id, userId });
    } else {
      const exp = memoryStore.expenses.get(id);
      if (exp && exp.userId === userId) {
        deletedExpense = exp;
        memoryStore.expenses.delete(id);
        memoryStore.saveExpenses();
      }
    }

    if (!deletedExpense) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }

    // Refresh budget spent for that month
    const [yearStr, monthStr] = deletedExpense.date.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const spent = await getMonthlySpent(userId, year, month);

    if (isMongoConnected) {
      await MonthlyBudgetModel.findOneAndUpdate({ userId, year, month }, { spent });
    } else {
      const budgetKey = `${userId}_${year}_${month}`;
      const b = memoryStore.monthlyBudgets.get(budgetKey);
      if (b) {
        b.spent = spent;
        memoryStore.saveBudgets();
      }
    }

    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete expense: ' + err.message });
  }
});

// -------------------------------------------------------------
// Budget Routes
// -------------------------------------------------------------

// GET /budget/:year/:month
app.get('/budget/:year/:month', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      res.status(400).json({ error: 'Invalid year or month' });
      return;
    }

    const spent = await getMonthlySpent(userId, year, month);
    // Auto-calculate planned from sum of category budget limits for this month
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const autoPlanned = await getCategoryBudgetSum(userId, monthStr);
    let planned = autoPlanned;
    let budgetId = '';

    if (isMongoConnected) {
      let budget = await MonthlyBudgetModel.findOne({ userId, year, month }).lean();
      if (!budget) {
        const created = await MonthlyBudgetModel.create({ userId, year, month, planned: autoPlanned, spent });
        budgetId = created._id.toString();
      } else {
        budgetId = budget._id.toString();
        // Always use auto-calculated planned; update stored value too
        planned = autoPlanned;
        await MonthlyBudgetModel.updateOne({ _id: budget._id }, { spent, planned: autoPlanned });
      }
    } else {
      const budgetKey = `${userId}_${year}_${month}`;
      let budget = memoryStore.monthlyBudgets.get(budgetKey);
      if (!budget) {
        budgetId = new Types.ObjectId().toString();
        budget = { _id: budgetId, userId, year, month, planned: autoPlanned, spent };
        memoryStore.monthlyBudgets.set(budgetKey, budget);
        memoryStore.saveBudgets();
      } else {
        budgetId = budget._id;
        budget.planned = autoPlanned;
        budget.spent = spent;
        memoryStore.saveBudgets();
      }
    }

    res.json({
      _id: budgetId,
      userId,
      year,
      month,
      planned,
      spent,
      remaining: Math.max(0, planned - spent),
      percentUsed: planned > 0 ? Math.round((spent / planned) * 100) : 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch budget: ' + err.message });
  }
});

// POST /budget/:year/:month
app.post('/budget/:year/:month', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);
    const { planned } = req.body;

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      res.status(400).json({ error: 'Invalid year or month' });
      return;
    }

    const numPlanned = Number(planned);
    if (isNaN(numPlanned) || numPlanned < 0) {
      res.status(400).json({ error: 'Planned amount must be a positive number or zero' });
      return;
    }

    const spent = await getMonthlySpent(userId, year, month);
    let budgetId = '';

    if (isMongoConnected) {
      const updated = await MonthlyBudgetModel.findOneAndUpdate(
        { userId, year, month },
        { planned: numPlanned, spent },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      budgetId = updated._id.toString();
    } else {
      const budgetKey = `${userId}_${year}_${month}`;
      let b = memoryStore.monthlyBudgets.get(budgetKey);
      if (b) {
        b.planned = numPlanned;
        b.spent = spent;
        budgetId = b._id;
      } else {
        budgetId = new Types.ObjectId().toString();
        memoryStore.monthlyBudgets.set(budgetKey, {
          _id: budgetId,
          userId,
          year,
          month,
          planned: numPlanned,
          spent,
        });
      }
      memoryStore.saveBudgets();
    }

    res.json({
      _id: budgetId,
      userId,
      year,
      month,
      planned: numPlanned,
      spent,
      remaining: Math.max(0, numPlanned - spent),
      percentUsed: numPlanned > 0 ? Math.round((spent / numPlanned) * 100) : 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update budget: ' + err.message });
  }
});

// Fallback HTML page routes for clean navigation
app.get('/login', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/register', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/dashboard', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/add-expense', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'add-expense.html')));
app.get('/categories-page', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'categories.html')));
app.get('/history-page', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'history.html')));

app.listen(PORT, () => {
  console.log(`BudgetSmart Express Server running on http://0.0.0.0:${PORT}`);
});
