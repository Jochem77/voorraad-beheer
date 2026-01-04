# Reparatie Systeem - Setup Instructies

## Database Setup

Voordat je het reparatie systeem kunt gebruiken, moet je eerst de database tabellen aanmaken in Supabase:

### Stap 1: Open Supabase SQL Editor

1. Ga naar je Supabase project dashboard
2. Klik op "SQL Editor" in het linkermenu
3. Klik op "New Query"

### Stap 2: Voer de SQL Migratie Uit

Kopieer de volledige inhoud van `REPAIRS_TABLE.sql` en voer deze uit in de SQL Editor.

Dit creëert:
- **repairs** tabel voor het opslaan van reparatie items
- **repair_actions** tabel voor het bijhouden van reparatie acties (bijv. "Scherm vervangen", "Joystick gerepareerd")
- Row Level Security (RLS) policies
- Indexes voor betere performance

### Stap 3: Verifieer de Tabellen

Na het uitvoeren van de SQL, controleer of de tabellen zijn aangemaakt:
1. Klik op "Table Editor" in het linkermenu
2. Je zou nu de tabellen `repairs` en `repair_actions` moeten zien

## Gebruik

### Reparaties Toevoegen

Er zijn twee manieren om een reparatie toe te voegen:

#### Optie 1: Via Controller Scanner
1. Ga naar de "Controller Scanner" tab
2. Scan een controller (Joy-Con, Pro Controller, DualSense, etc.)
3. Klik op **🔧 Toevoegen als Reparatie**
4. Vul de gegevens in:
   - Type, Kleur en Serienummer worden automatisch ingevuld
   - Voeg klant naam toe
   - Beschrijf het defect
   - Optioneel: voeg reparatie datum, prijs en factuur toe

#### Optie 2: Manueel
1. Ga naar de "Reparaties" tab
2. Klik op de "+" knop (toekomstige feature)
3. Vul alle gegevens manueel in

### Reparaties Bekijken

Ga naar de **🔧 Reparaties** tab om alle reparaties te zien met:
- Type controller
- Kleur (met kleurvoorbeeld)
- Serienummer
- Klant naam
- Defect beschrijving
- Reparatie datum en prijs
- Datum toegevoegd

### Verschil tussen Voorraad en Reparaties

| Aspect | Voorraad | Reparaties |
|--------|----------|------------|
| **SKU** | ✅ Ja, uniek nummer | ❌ Nee |
| **Staat** | ✅ Ja (als nieuw, gebruikt, etc.) | ❌ Nee |
| **Status** | ✅ Ja (nieuw, getest, defect, verkocht) | ❌ Nee |
| **Aankoop Info** | ✅ Ja (prijs, datum, factuur, bron) | ❌ Nee |
| **Verkoop/Reparatie Info** | ✅ Verkoopinfo | ✅ Reparatie info (datum, prijs, factuur) |
| **Klant/Koper** | ✅ Koper naam | ✅ Klant naam |
| **Defect Info** | ❌ Nee | ✅ Ja (defect notities) |
| **Acties** | ✅ Ja | ✅ Ja (via repair_actions) |
| **Foto's** | ✅ Ja | ✅ Ja |

## Features

### Huidige Features ✅
- Reparaties toevoegen via scanner met auto-fill
- Reparaties toevoegen via manueel formulier
- Lijst van alle reparaties
- Basis CRUD operaties (Create, Read, Update, Delete)
- Klant informatie bijhouden
- Defect notities
- Reparatie prijs en facturering

### Toekomstige Features 🚧
- Detail modal voor reparaties (vergelijkbaar met inventory items)
- Reparatie acties toevoegen (bijv. "Scherm vervangen", "Joystick gerepareerd")
- Foto's uploaden voor reparaties
- Filter en zoek functionaliteit
- Status tracking (In reparatie, Wacht op onderdelen, Klaar voor ophalen, etc.)
- Notificaties voor klanten
- Export naar PDF voor facturen

## Database Schema

### repairs tabel
```sql
- id: BIGINT (Primary Key)
- type: TEXT (Product type: switch_joycon_left, ps5_dualsense, etc.)
- kleur: TEXT (Kleur naam)
- kleur_hex: TEXT (Hex kleurcode, optioneel)
- serienummer: TEXT (Serial number)
- repair_date: TIMESTAMP (Reparatie datum)
- repair_price: NUMERIC(10,2) (Reparatie prijs)
- repair_invoice: TEXT (Factuur nummer)
- customer_name: TEXT (Naam van de klant)
- defect_notes: TEXT (Beschrijving van het defect)
- notes: TEXT (Extra notities)
- photo_urls: TEXT[] (Array van foto URLs)
- date_added: TIMESTAMP (Automatisch toegevoegd)
- created_at: TIMESTAMP (Automatisch toegevoegd)
```

### repair_actions tabel
```sql
- id: BIGINT (Primary Key)
- repair_id: BIGINT (Foreign Key naar repairs)
- action: TEXT (Type actie)
- description: TEXT (Beschrijving van de actie)
- date_added: TIMESTAMP (Datum van actie)
- created_at: TIMESTAMP (Automatisch toegevoegd)
```

## Troubleshooting

### "Fout bij toevoegen van reparatie"
- Controleer of je de SQL migratie hebt uitgevoerd
- Controleer of de RLS policies correct zijn ingesteld
- Controleer de browser console voor meer details

### Reparaties worden niet geladen
- Controleer of je bent ingelogd
- Controleer de Supabase verbinding
- Verifieer dat de `repairs` tabel bestaat

### Controller wordt niet herkend
- Controleer of WebHID API wordt ondersteund in je browser (Chrome/Edge)
- Zorg ervoor dat de controller is verbonden
- Probeer de controller opnieuw te verbinden
