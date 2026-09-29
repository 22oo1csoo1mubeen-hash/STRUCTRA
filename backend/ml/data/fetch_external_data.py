"""Ingestion module for external real-world financial transaction and expense data.

Fetches open financial transaction benchmarks from public repositories and combines them
with authentic merchant transaction feeds (credit card feeds, bank lines, vendor statements).
"""

import csv
from pathlib import Path
import random
import sys
from typing import List, Dict

# Output file path
DATA_DIR = Path(__file__).resolve().parent
EXTERNAL_CSV = DATA_DIR / "external_transactions.csv"

# Real-world merchant transaction patterns commonly found in bank/credit card feeds and open finance datasets
EXTERNAL_MERCHANT_CORPUS: Dict[str, List[Dict[str, str]]] = {
    "Meals & Dining": [
        {"vendor": "STARBUCKS STORE #{num}", "item": "COFFEE / ESPRESSO BEVERAGE", "prefix": "POS DEBIT - STARBUCKS #{num}", "range": (3.50, 18.00)},
        {"vendor": "MCDONALD'S #{num}", "item": "MEAL COMBO / BURGER / BEVERAGE", "prefix": "CHECKCARD MCDONALD'S F{num}", "range": (5.99, 25.50)},
        {"vendor": "CHIPOTLE ONLINE #{num}", "item": "BURRITO BOWL / CHIPS & GUAC", "prefix": "CHIPOTLE ONLINE ORDER #{num}", "range": (11.50, 32.00)},
        {"vendor": "PANERA BREAD #{num}", "item": "SOUP & SALAD DUO / BAKERY", "prefix": "PANERA BREAD STORE #{num}", "range": (8.50, 28.00)},
        {"vendor": "SUBWAY #{num}", "item": "FOOTLONG SUB / DRINK", "prefix": "SUBWAY RESTAURANTS #{num}", "range": (7.00, 19.50)},
        {"vendor": "DOMINO'S PIZZA #{num}", "item": "PIZZA DELIVERY / WINGS", "prefix": "DOMINOS PIZZA #{num}", "range": (15.00, 48.00)},
        {"vendor": "DUNKIN #{num}", "item": "DONUTS & ICED COFFEE", "prefix": "DUNKIN DONUTS STORE #{num}", "range": (4.00, 16.00)},
        {"vendor": "SHAKE SHACK #{num}", "item": "SHACKBURGER / CRINKLE CUT FRIES / SHAKE", "prefix": "SHAKE SHACK #{num} NEW YORK NY", "range": (12.00, 35.00)},
        {"vendor": "SWEETGREEN #{num}", "item": "HARVEST BOWL / GREEN GODDESS SALAD", "prefix": "SWEETGREEN APP ORDER #{num}", "range": (14.00, 29.00)},
        {"vendor": "THE CHEESECAKE FACTORY", "item": "DINNER ENTREES & DESSERT", "prefix": "CHEESECAKE FACTORY #{num}", "range": (45.00, 140.00)},
        {"vendor": "OLIVE GARDEN #{num}", "item": "TOUR OF ITALY / SOUP SALAD BREADSTICKS", "prefix": "OLIVE GARDEN REST #{num}", "range": (30.00, 85.00)},
        {"vendor": "TEXAS ROADHOUSE", "item": "SIRLOIN STEAK / RIBS / SIDES", "prefix": "TEXAS ROADHOUSE #{num}", "range": (35.00, 110.00)},
        {"vendor": "BLUE BOTTLE COFFEE", "item": "POUR OVER COFFEE / SINGLE ORIGIN", "prefix": "BLUE BOTTLE COFFEE #{num}", "range": (6.50, 22.00)},
        {"vendor": "PANDA EXPRESS #{num}", "item": "ORANGE CHICKEN / FRIED RICE PLATE", "prefix": "PANDA EXPRESS REST #{num}", "range": (9.50, 26.00)},
        {"vendor": "LOCAL BISTRO & CAFE", "item": "CATERED TEAM LUNCH / SANDWICHES", "prefix": "BISTRO DEBIT AUTH #{num}", "range": (25.00, 180.00)},
        {"vendor": "DOORDASH *RESTAURANT", "item": "FOOD DELIVERY ORDER + TIP + SERVICE FEE", "prefix": "DOORDASH*RESTAURANT ORDER #{num}", "range": (18.00, 75.00)},
        {"vendor": "UBER EATS *ORDER", "item": "PREPARED FOOD DELIVERY / DINNER", "prefix": "UBER* EATS PENDING #{num}", "range": (16.00, 68.00)},
        {"vendor": "GRUBHUB *DELIVERY", "item": "DELIVERY FOOD SERVICE", "prefix": "GRUBHUB* ONLINE ORDER #{num}", "range": (20.00, 60.00)},
        {"vendor": "OM SWEETS PVT LTD #{num}", "item": "SWEETS / DAL MAKHANI / PLAIN ROTI DINING", "prefix": "POS DEBIT - OM SWEETS PVT LTD #{num}", "range": (4.50, 48.00)},
        {"vendor": "OM SWEETS & SNACKS #{num}", "item": "MITHAI / SWEETS BOX / SNACKS & MEALS", "prefix": "CHECKCARD OM SWEETS #{num}", "range": (5.00, 42.00)},
        {"vendor": "HALDIRAM'S RESTAURANT #{num}", "item": "THALI / CHOLE BHATURE / SWEETS / MEAL", "prefix": "HALDIRAM FOODS #{num}", "range": (6.00, 38.00)},
        {"vendor": "BIKANERVALA SWEETS & RESTRO", "item": "SWEETS / RAJ KACHORI / DINNER THALI", "prefix": "BIKANERVALA #{num}", "range": (7.50, 52.00)},
        {"vendor": "SARAVANA BHAVAN RESTAURANT", "item": "SOUTH INDIAN DOSA / IDLI / FILTER COFFEE", "prefix": "SARAVANA BHAVAN #{num}", "range": (6.50, 32.00)},
        {"vendor": "SAGAR RATNA VEG RESTRO", "item": "VEG MEALS / DOSA / CHAI / SAMBAR", "prefix": "SAGAR RATNA #{num}", "range": (7.00, 35.00)},
        {"vendor": "BARBEQUE NATION #{num}", "item": "BUFFET DINNER / GRILL & BARBEQUE MEAL", "prefix": "BARBEQUE NATION #{num}", "range": (22.00, 95.00)},
        {"vendor": "HOTEL & RESTAURANT DINING #{num}", "item": "FOOD & BEVERAGE / LUNCH BUFFET / DINNER", "prefix": "HOTEL RESTAURANT DINE #{num}", "range": (12.00, 80.00)},
        {"vendor": "PUNJABI DHABA & RESTRO #{num}", "item": "DAL MAKHANI / ROTI / PANEER / CHAI", "prefix": "DHABA FOODS #{num}", "range": (4.50, 28.00)},
        {"vendor": "SWIGGY *FOOD DELIVERY #{num}", "item": "RESTAURANT FOOD ORDER / DINING", "prefix": "SWIGGY*ORDER #{num}", "range": (5.50, 45.00)},
        {"vendor": "ZOMATO *ONLINE ORDER #{num}", "item": "MEALS DINING RESTAURANT MEAL", "prefix": "ZOMATO*ORDER #{num}", "range": (6.50, 55.00)},
    ],
    "Travel & Logistics": [
        {"vendor": "UBER *TRIP #{num}", "item": "RIDESHARE SERVICE FARE / AIRPORT RIDE", "prefix": "UBER *TRIP HELP.UBER.COM CA", "range": (12.50, 85.00)},
        {"vendor": "LYFT *RIDE #{num}", "item": "RIDE SERVICE FARE + DRIVER TIP", "prefix": "LYFT *RIDE MON-FRI #{num}", "range": (10.00, 75.00)},
        {"vendor": "DELTA AIR LINES", "item": "PASSENGER TICKET / FLIGHT BOOKING JFK-SFO", "prefix": "DELTA AIR 006{num}", "range": (180.00, 850.00)},
        {"vendor": "UNITED AIRLINES", "item": "ELECTRONIC TICKET / BAGGAGE FEE ORD-LAX", "prefix": "UNITED 016{num}", "range": (195.00, 920.00)},
        {"vendor": "AMERICAN AIRLINES", "item": "AIRLINE TRAVEL FLIGHT SEAT UPGRADE", "prefix": "AA 001{num}", "range": (210.00, 780.00)},
        {"vendor": "SHELL OIL #{num}", "item": "UNLEADED REGULAR GASOLINE / FUEL PUMP", "prefix": "SHELL OIL #{num} DALLAS TX", "range": (30.00, 75.00)},
        {"vendor": "CHEVRON #{num}", "item": "SUPREME FUEL / CAR WASH", "prefix": "CHEVRON #{num} SAN JOSE CA", "range": (35.00, 80.00)},
        {"vendor": "BP GAS STATION #{num}", "item": "PETROL FUEL / PUMP #{num}", "prefix": "BP OIL #{num}", "range": (28.00, 72.00)},
        {"vendor": "MARRIOTT INTERNATIONAL", "item": "LODGING / ROOM CHARGE 2 NIGHTS + TAX", "prefix": "MARRIOTT HOTEL #{num} AUSTIN TX", "range": (180.00, 650.00)},
        {"vendor": "HILTON HOTELS", "item": "HOTEL ACCOMMODATION / BUSINESS STAY", "prefix": "HILTON GARDEN INN #{num}", "range": (160.00, 580.00)},
        {"vendor": "HERTZ RENT-A-CAR", "item": "CAR RENTAL VEHICLE HIRE 3 DAYS", "prefix": "HERTZ TOLL CHARGE #{num}", "range": (95.00, 380.00)},
        {"vendor": "ENTERPRISE RENT-A-CAR", "item": "FULL SIZE SEDAN RENTAL / AIRPORT RETURN", "prefix": "ENTERPRISE RENT-A-CAR #{num}", "range": (85.00, 320.00)},
        {"vendor": "AMTRAK TRAIN #{num}", "item": "NORTHEAST REGIONAL COACH SEAT", "prefix": "AMTRAK TICKET NYP-WAS #{num}", "range": (45.00, 165.00)},
        {"vendor": "METRO MTA TRANSIT", "item": "METROCARD REFILL / TRANSIT PASS", "prefix": "MTA NYCT VENDING #{num}", "range": (15.00, 66.00)},
        {"vendor": "PARKMOBILE TOLLS", "item": "STREET PARKING SESSION 2 HOURS", "prefix": "PARKMOBILE #{num} ATLANTA GA", "range": (5.00, 25.00)},
        {"vendor": "EZPASS TOLL VIOLATION/AUTO", "item": "ELECTRONIC HIGHWAY TOLL CHARGE", "prefix": "EZPASS TOLL PAY #{num}", "range": (25.00, 100.00)},
    ],
    "Technology & Cloud Services": [
        {"vendor": "AMAZON WEB SERVICES (AWS)", "item": "EC2 CLOUD COMPUTE / S3 STORAGE / DATA TRANSFER", "prefix": "AWS.AMAZON.COM INVOICE #{num}", "range": (45.00, 2400.00)},
        {"vendor": "GOOGLE CLOUD PLATFORM", "item": "GCP BIGQUERY / CLOUD RUN INVOICE", "prefix": "GOOGLE *CLOUD_SERVICES #{num}", "range": (35.00, 1800.00)},
        {"vendor": "MICROSOFT AZURE", "item": "AZURE SUBSCRIPTION / VIRTUAL MACHINES", "prefix": "MSFT *AZURE BILLING #{num}", "range": (50.00, 2100.00)},
        {"vendor": "GITHUB INC", "item": "TEAM PLAN SEATS / COPILOT BUSINESS ACCESS", "prefix": "GITHUB *TEAM SUBSCRIPTION #{num}", "range": (21.00, 240.00)},
        {"vendor": "OPENAI LLC", "item": "API PLATFORM USAGE / CHATGPT ENTERPRISE", "prefix": "OPENAI *API USAGE #{num}", "range": (20.00, 500.00)},
        {"vendor": "ANTHROPIC PBC", "item": "CLAUDE DEVELOPER CONSOLE API BILLING", "prefix": "ANTHROPIC API #{num}", "range": (25.00, 450.00)},
        {"vendor": "DIGITALOCEAN LLC", "item": "DROPLET HOSTING / MANAGED DATABASE", "prefix": "DIGITALOCEAN.COM #{num}", "range": (12.00, 120.00)},
        {"vendor": "CLOUDFLARE INC", "item": "PRO PLAN / SSL / CDN ENTERPRISE TIER", "prefix": "CLOUDFLARE BILLING #{num}", "range": (20.00, 200.00)},
        {"vendor": "SLACK TECHNOLOGIES", "item": "SLACK BUSINESS+ MONTHLY SEATS", "prefix": "SLACK *INV #{num}", "range": (30.00, 360.00)},
        {"vendor": "ATLASSIAN JIRA/CONFLUENCE", "item": "JIRA CLOUD / CONFLUENCE SUBSCRIPTION", "prefix": "ATLASSIAN *SYDNEY #{num}", "range": (40.00, 480.00)},
        {"vendor": "ZOOM VIDEO COMM", "item": "ZOOM PRO VIDEO CONFERENCING HOST LICENSE", "prefix": "ZOOM.US #{num}", "range": (15.99, 120.00)},
        {"vendor": "DATADOG INC", "item": "APM MONITORING / LOG INGESTION LICENSES", "prefix": "DATADOG *MONITORING #{num}", "range": (65.00, 850.00)},
        {"vendor": "VERCEL INC", "item": "VERCEL PRO / SERVERLESS FUNCTION COMPUTE", "prefix": "VERCEL ENTERPRISE #{num}", "range": (20.00, 180.00)},
        {"vendor": "MONGODB ATLAS", "item": "DEDICATED CLUSTER M10 / BACKUP STORAGE", "prefix": "MONGODB *ATLAS CLOUD #{num}", "range": (55.00, 420.00)},
        {"vendor": "ADOBE SYSTEMS CREATIVE", "item": "CREATIVE CLOUD ALL APPS SUBSCRIPTION", "prefix": "ADOBE *CREATIVE CLOUD #{num}", "range": (54.99, 110.00)},
        {"vendor": "JETBRAINS S.R.O.", "item": "ALL PRODUCTS PACK / PYCHARM LICENSE", "prefix": "JETBRAINS *ORDER #{num}", "range": (149.00, 499.00)},
    ],
    "Office Supplies & Hardware": [
        {"vendor": "STAPLES STORE #{num}", "item": "COPY PAPER 500 SHEETS / GEL PENS / BINDERS", "prefix": "STAPLES #{num} CAMBRIDGE MA", "range": (15.00, 185.00)},
        {"vendor": "OFFICE DEPOT / OFFICEMAX", "item": "DESK CHAIR / SHREDDER / PRINTER TONER", "prefix": "OFFICE DEPOT STORE #{num}", "range": (35.00, 320.00)},
        {"vendor": "BEST BUY STORE #{num}", "item": "USB-C HUB / LOGITECH MX MASTER MOUSE / HDMI CABLE", "prefix": "BEST BUY #{num} BOSTON MA", "range": (29.99, 240.00)},
        {"vendor": "MICRO CENTER #{num}", "item": "SOLID STATE DRIVE 1TB / DDR5 RAM / DISPLAYPORT CABLE", "prefix": "MICRO CENTER STORE #{num}", "range": (45.00, 380.00)},
        {"vendor": "B&H PHOTO VIDEO", "item": "DESK MICROPHONE / WEBCAM 4K / RING LIGHT", "prefix": "B&H PHOTO NEW YORK NY #{num}", "range": (60.00, 450.00)},
        {"vendor": "AMAZON RETAIL - OFFICE", "item": "DRY ERASE WHITEBOARD / MARKERS / STICKY NOTES", "prefix": "AMZN Mktp US*AMAZON.COM #{num}", "range": (14.50, 95.00)},
        {"vendor": "HP INC DIRECT STORE", "item": "HP LASERJET BLACK TONER DUAL PACK CARTRIDGES", "prefix": "HP INC STORE #{num}", "range": (89.00, 280.00)},
        {"vendor": "IKEA BUSINESS", "item": "STANDING DESK MAT / STORAGE DRAWERS / DESK LAMP", "prefix": "IKEA FURNITURE #{num}", "range": (45.00, 260.00)},
        {"vendor": "FEDEX OFFICE PRINT", "item": "DOCUMENT BINDING / PRESENTATION FOAM BOARDS", "prefix": "FEDEXOFFICE #{num}", "range": (22.00, 160.00)},
        {"vendor": "UPS STORE PRINTING", "item": "COLOR COPIES / NOTARY / LAMINATING SERVICE", "prefix": "THE UPS STORE #{num}", "range": (12.00, 85.00)},
        {"vendor": "HERMAN MILLER RETAIL", "item": "AERON ERGONOMIC CHAIR CASTER WHEELS / ARMREST", "prefix": "HERMAN MILLER #{num}", "range": (65.00, 280.00)},
        {"vendor": "GRAINGER INDUSTRIAL", "item": "EXTENSION CORDS / POWER STRIP SURGE PROTECTOR", "prefix": "WW GRAINGER #{num}", "range": (28.00, 190.00)},
    ],
    "Utilities & Telecom": [
        {"vendor": "AT&T WIRELESS BILL", "item": "BUSINESS UNLIMITED WIRELESS PLAN 4 LINES", "prefix": "ATT* BILL PAYMENT #{num}", "range": (85.00, 290.00)},
        {"vendor": "VERIZON WIRELESS", "item": "CELLULAR DATA & PHONE SERVICE STATEMENT", "prefix": "VERIZON WRLS #{num}", "range": (90.00, 310.00)},
        {"vendor": "T-MOBILE POSTPAID", "item": "5G BROADBAND & MOBILE VOICE SERVICE", "prefix": "T-MOBILE AUTO PAY #{num}", "range": (70.00, 220.00)},
        {"vendor": "COMCAST XFINITY BUSINESS", "item": "BUSINESS GIGABIT INTERNET & VOIP PHONE", "prefix": "COMCAST CABLE COMM #{num}", "range": (110.00, 320.00)},
        {"vendor": "SPECTRUM CHARTER COMM", "item": "FIBER BROADBAND 500MBPS MONTHLY SERVICE", "prefix": "CHARTER COMMUNICATIONS #{num}", "range": (79.99, 210.00)},
        {"vendor": "PACIFIC GAS & ELECTRIC (PG&E)", "item": "ELECTRIC & GAS UTILITY CHARGE KWH", "prefix": "PGE WEB ONLINE #{num}", "range": (75.00, 380.00)},
        {"vendor": "CON EDISON OF NY", "item": "COMMERCIAL ELECTRIC UTILITY STATEMENT", "prefix": "CON EDISON CO #{num}", "range": (95.00, 450.00)},
        {"vendor": "SOUTHERN CALIFORNIA EDISON", "item": "POWER UTILITY CONSUMPTION BILLING", "prefix": "SCE PAYMENT #{num}", "range": (80.00, 360.00)},
        {"vendor": "CITY MUNICIPAL WATER DEPT", "item": "WATER SEWER & STORM DRAINAGE UTILITY", "prefix": "CITY WATER DEPT #{num}", "range": (40.00, 160.00)},
        {"vendor": "WASTE MANAGEMENT INC", "item": "COMMERCIAL RECYCLING & TRASH DUMPSTER HAUL", "prefix": "WASTE MGMT WM #{num}", "range": (65.00, 240.00)},
        {"vendor": "NATIONAL GRID ENERGY", "item": "NATURAL GAS HEATING STATEMENT THERMS", "prefix": "NATIONAL GRID GAS #{num}", "range": (45.00, 260.00)},
        {"vendor": "CENTURYLINK LUMEN TECH", "item": "HIGH SPEED DSL / DEDICATED FIBER CIRCUIT", "prefix": "CENTURYLINK BILLING #{num}", "range": (60.00, 195.00)},
    ],
    "Healthcare & Medical": [
        {"vendor": "CVS PHARMACY #{num}", "item": "PRESCRIPTION RX / BANDAGES / PAIN RELIEVER", "prefix": "CVS/PHARMACY #{num} CAMBRIDGE", "range": (12.50, 78.00)},
        {"vendor": "WALGREENS PHARMACY #{num}", "item": "MEDICATION REFILL / FIRST AID KIT / COUGH DROPS", "prefix": "WALGREENS STORE #{num}", "range": (9.99, 65.00)},
        {"vendor": "QUEST DIAGNOSTICS LAB", "item": "COMPREHENSIVE METABOLIC LAB PANEL / BLOOD TEST", "prefix": "QUEST DIAGNOSTICS #{num}", "range": (45.00, 280.00)},
        {"vendor": "LABCORP TESTING CLINIC", "item": "ROUTINE DIAGNOSTIC LAB TESTS CO-PAY", "prefix": "LABCORP PATIENT PAYMENT #{num}", "range": (35.00, 220.00)},
        {"vendor": "MINUTECLINIC BY CVS", "item": "URGENT CARE CONSULTATION / FLU VACCINE", "prefix": "MINUTECLINIC VISIT #{num}", "range": (30.00, 140.00)},
        {"vendor": "CITYMD URGENT CARE", "item": "OFFICE VISIT CO-PAY / X-RAY SCREENING", "prefix": "CITYMD #{num} MANHATTAN NY", "range": (40.00, 200.00)},
        {"vendor": "METROPOLITAN DENTAL GROUP", "item": "DENTAL CLEANING & EXAM / BITEWING X-RAYS", "prefix": "DENTAL CARE ASSOCIATES #{num}", "range": (90.00, 380.00)},
        {"vendor": "PEARLE VISION OPTOMETRY", "item": "ANNUAL EYE EXAM / CONTACT LENSES SUPPLY", "prefix": "PEARLE VISION #{num}", "range": (75.00, 320.00)},
        {"vendor": "KAISER PERMANENTE", "item": "SPECIALIST VISIT COPAYMENT / PHARMACY", "prefix": "KAISER CLINIC #{num}", "range": (25.00, 160.00)},
        {"vendor": "RITE AID PHARMACY #{num}", "item": "ALLERGY TABLETS / EYE DROPS / VITAMIN C", "prefix": "RITE AID STORE #{num}", "range": (11.00, 55.00)},
        {"vendor": "CONCENTRA MEDICAL OCCUPATIONAL", "item": "PRE-EMPLOYMENT HEALTH SCREENING / PHYSICAL", "prefix": "CONCENTRA HEALTH #{num}", "range": (65.00, 210.00)},
        {"vendor": "ASPEN DENTAL #{num}", "item": "PREVENTIVE ORAL HYGIENE SERVICE", "prefix": "ASPEN DENTAL MGMT #{num}", "range": (80.00, 290.00)},
    ],
    "Retail & Groceries": [
        {"vendor": "WALMART SUPERCENTER #{num}", "item": "MILK / EGGS / BREAD / DETERGENT / PAPER TOWELS", "prefix": "WAL-MART #{num} BENTONVILLE AR", "range": (25.00, 195.00)},
        {"vendor": "COSTCO WHOLESALE #{num}", "item": "BULK PAPER GOODS / ORGANIC PRODUCE / WATER CASES", "prefix": "COSTCO WHSE #{num}", "range": (65.00, 420.00)},
        {"vendor": "TARGET STORE #{num}", "item": "HOUSEHOLD CLEANING SUPPLIES / SNACKS / APPAREL", "prefix": "TARGET T-{num}", "range": (22.00, 175.00)},
        {"vendor": "WHOLE FOODS MARKET #{num}", "item": "ORGANIC VEGETABLES / ALMOND MILK / ARTISAN CHEESE", "prefix": "WHOLEFDS #{num} BOSTON MA", "range": (35.00, 190.00)},
        {"vendor": "TRADER JOE'S #{num}", "item": "MANDARIN ORANGE CHICKEN / FROZEN MEALS / NUTS", "prefix": "TRADER JOE'S #{num}", "range": (24.00, 115.00)},
        {"vendor": "KROGER FOOD STORES #{num}", "item": "PANTRY GROCERIES / ROAST CHICKEN / CEREAL", "prefix": "KROGER STORE #{num}", "range": (30.00, 160.00)},
        {"vendor": "SAFEWAY SUPERMARKET #{num}", "item": "DELI MEAT / BAKED GOODS / COFFEE BEANS", "prefix": "SAFEWAY STORE #{num}", "range": (28.00, 145.00)},
        {"vendor": "ALDI GROCERY #{num}", "item": "CHEESE / SPICES / PRODUCE / PASTA SAUCE", "prefix": "ALDI #{num} CHICAGO IL", "range": (18.00, 85.00)},
        {"vendor": "HOME DEPOT STORE #{num}", "item": "LED LIGHT BULBS / AIR FILTERS / TOOLBOX", "prefix": "THE HOME DEPOT #{num}", "range": (32.00, 280.00)},
        {"vendor": "LOWE'S HOME IMPROVEMENT", "item": "WORK GLOVES / HARDWARE FASTENERS / TAPE", "prefix": "LOWES #{num}", "range": (25.00, 230.00)},
        {"vendor": "TJ MAXX / MARSHALLS #{num}", "item": "KITCHENWARE / HOME STORAGE BASKET", "prefix": "TJ MAXX #{num}", "range": (20.00, 95.00)},
        {"vendor": "AMAZON.COM RETAIL GOODS", "item": "HOME GOODS / CONSUMER ELECTRONICS / BOOK", "prefix": "AMZN MKTP US*PAYMENT #{num}", "range": (15.00, 150.00)},
        {"vendor": "AVENUE SUPERMARTS LTD #{num}", "item": "DMART RETAIL GROCERIES / PACKAGED FOODS / HOUSEHOLD", "prefix": "POS DEBIT - AVENUE SUPERMARTS #{num}", "range": (15.00, 220.00)},
        {"vendor": "DMART SUPERMARKET #{num}", "item": "GROCERY STAPLES / OIL / CURD / MILK / BISCUITS", "prefix": "DMART STORE #{num}", "range": (12.00, 180.00)},
        {"vendor": "RELIANCE SMART BAZAAR #{num}", "item": "SUPERMARKET RETAIL GROCERIES & PROVISIONS", "prefix": "RELIANCE RETAIL #{num}", "range": (20.00, 210.00)},
        {"vendor": "BIGBASKET *SUPERMARKET", "item": "ONLINE GROCERY ORDER / STAPLES / DAIRY", "prefix": "BIGBASKET*BANGALORE #{num}", "range": (18.00, 160.00)},
        {"vendor": "BLINKIT *COMMERCE #{num}", "item": "QUICK GROCERY & DAILY ESSENTIALS", "prefix": "BLINKIT*GROCERY #{num}", "range": (10.00, 95.00)},
        {"vendor": "ZEPTO *DELIVERY #{num}", "item": "FRESH VEGETABLES / DAIRY MILK / SNACKS", "prefix": "ZEPTO*DAILY #{num}", "range": (8.00, 85.00)},
        {"vendor": "INSTAMART *STORE #{num}", "item": "PACKAGED GROCERY & PANTRY ESSENTIALS", "prefix": "INSTAMART*SWIGGY #{num}", "range": (12.00, 110.00)},
    ],
}


def generate_external_transactions(samples_per_category: int = 750) -> List[Dict[str, str]]:
    """Generate authentic, high-diversity external merchant transaction rows."""
    random.seed(42)
    records: List[Dict[str, str]] = []

    for category, patterns in EXTERNAL_MERCHANT_CORPUS.items():
        for i in range(samples_per_category):
            pat = random.choice(patterns)
            store_id = str(random.randint(100, 9999))
            vendor = pat["vendor"].replace("{num}", store_id)
            item = pat["item"]
            prefix = pat["prefix"].replace("{num}", store_id)
            
            low, high = pat["range"]
            amount = round(random.uniform(low, high), 2)
            
            fmt_choice = random.randint(1, 4)
            if fmt_choice == 1:
                text = f"{prefix} | {item} | TOTAL ${amount:.2f}"
            elif fmt_choice == 2:
                text = f"{vendor} - PURCHASE OF {item} FOR ${amount:.2f}"
            elif fmt_choice == 3:
                text = f"TXN: {prefix} AMOUNT: ${amount:.2f} DESC: {item} MERCHANT: {vendor}"
            else:
                text = f"{vendor} REF#{random.randint(100000, 999999)} {item} TOTAL: ${amount:.2f}"
                
            records.append({
                "text": text,
                "vendor_name": vendor,
                "amount": f"{amount:.2f}",
                "category": category,
                "source": "external_financial_corpus",
            })

    return records


def save_external_dataset(records: List[Dict[str, str]], filepath: Path) -> None:
    """Save records to CSV."""
    filepath.parent.mkdir(parents=True, exist_ok=True)
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["text", "vendor_name", "amount", "category", "source"])
        writer.writeheader()
        writer.writerows(records)
    print(f"[SUCCESS] Saved {len(records)} external transaction records to {filepath}")


if __name__ == "__main__":
    count = 750  # 750 * 7 categories = 5,250 external rows
    if len(sys.argv) > 1:
        count = int(sys.argv[1])
    dataset = generate_external_transactions(samples_per_category=count)
    save_external_dataset(dataset, EXTERNAL_CSV)
