# Database Connection Error - Fix Guide

## 🔴 Error
```
Can't reach database server at `ep-spring-tooth-ad5tyrbl-pooler.c-2.us-east-1.aws.neon.tech:5432`
```

## 🔍 Root Causes

### **1. Neon Database is Sleeping (Most Common)**
Neon free tier databases automatically sleep after 5 minutes of inactivity.

**Solution**: Wake up the database
1. Go to [Neon Console](https://console.neon.tech/)
2. Find your project
3. Click on your database
4. Wait for it to wake up (takes ~10-30 seconds)
5. Try uploading again

### **2. Wrong Connection String**
Your `.env` file might have an incorrect `DATABASE_URL`.

**Solution**: Update connection string
1. Go to [Neon Console](https://console.neon.tech/)
2. Go to your project → Connection Details
3. Copy the connection string (Pooled connection)
4. Update `.env`:
   ```env
   DATABASE_URL="postgresql://user:password@ep-spring-tooth-ad5tyrbl-pooler.c-2.us-east-1.aws.neon.tech:5432/neondb?sslmode=require"
   ```
5. Restart your dev server

### **3. Network/Firewall Issue**
Your network might be blocking the connection.

**Solution**: Check network
1. Try accessing from a different network
2. Check if your firewall is blocking port 5432
3. Try using a VPN if behind corporate firewall

### **4. Database Deleted or Suspended**
Your Neon database might have been deleted or suspended.

**Solution**: Check database status
1. Go to [Neon Console](https://console.neon.tech/)
2. Verify your database exists
3. Check if it's suspended (free tier limits)
4. Create a new database if needed

## ✅ Quick Fix Options

### **Option 1: Use Local PostgreSQL (Recommended for Development)**

1. **Install PostgreSQL**:
   ```bash
   # macOS
   brew install postgresql@15
   brew services start postgresql@15
   ```

2. **Create local database**:
   ```bash
   createdb intellitutor
   ```

3. **Update `.env`**:
   ```env
   DATABASE_URL="postgresql://localhost:5432/intellitutor"
   ```

4. **Run migrations**:
   ```bash
   cd intellitutor
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Restart server**:
   ```bash
   npm run dev
   ```

### **Option 2: Use SQLite (Easiest for Testing)**

1. **Update `prisma/schema.prisma`**:
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = "file:./dev.db"
   }
   ```

2. **Update `.env`**:
   ```env
   DATABASE_URL="file:./dev.db"
   ```

3. **Run migrations**:
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

4. **Restart server**

### **Option 3: Create New Neon Database**

1. Go to [Neon](https://neon.tech/)
2. Create new project
3. Copy connection string
4. Update `.env`
5. Run migrations
6. Restart server

## 🧪 Test Database Connection

Run this command to test:
```bash
cd intellitutor
npx prisma db push
```

If successful, you'll see:
```
✅ Database connected successfully
```

## 🔧 Current Workaround

I've added error handling so the app won't crash if the database is down, but you still need a working database for uploads to work properly.

## 📝 Recommended Setup

For development, I recommend **local PostgreSQL** because:
- ✅ No network dependency
- ✅ No sleep issues
- ✅ Faster
- ✅ Free
- ✅ Works offline

For production, use Neon or another cloud provider.

## 🚀 Next Steps

1. Choose one of the options above
2. Set up the database
3. Run migrations
4. Restart your dev server
5. Try uploading again

The upload should work once the database connection is fixed! 📄✨
