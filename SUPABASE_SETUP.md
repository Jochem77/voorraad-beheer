# Supabase Setup

## Stap 1: Maak een Supabase account
Ga naar https://supabase.com en maak een gratis account aan.

## Stap 2: Maak een nieuw project
- Klik "New Project"
- Kies een naam (bijv. "voorraad-beheer")
- Voer een sterk wachtwoord in
- Kies regio "Netherlands" (of dichtbij)

## Stap 3: Maak de tabel
Als je in het Supabase dashboard bent:

1. Ga naar "SQL Editor" aan de linkerkant
2. Klik "New Query"
3. Kopieëer en plak deze SQL:

```sql
CREATE TABLE inventory_items (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  type TEXT NOT NULL,
  kleur TEXT NOT NULL,
  serienummer TEXT NOT NULL UNIQUE,
  staat TEXT NOT NULL,
  status TEXT NOT NULL,
  date_added TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations" ON inventory_items
  FOR ALL USING (true);
```

4. Klik "Run"

## Stap 4: Voeg environment variabelen toe
1. Ga naar "Project Settings" (tandwiel icoon)
2. Klik op "API" tab
3. Kopieer de "Project URL"
4. Kopieer de "anon" public API key
5. Maak een `.env.local` bestand in je project root:

```
VITE_SUPABASE_URL=YOUR_PROJECT_URL_HERE
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
```

6. Vervanging YOUR_PROJECT_URL_HERE en YOUR_ANON_KEY_HERE met je waarden

## Stap 5: Install dependencies
```bash
npm install
```

## Stap 6: Start de dev server
```bash
npm run dev
```

Je app is nu klaar om data op te slaan in Supabase!
