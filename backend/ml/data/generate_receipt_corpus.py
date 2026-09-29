"""Receipt & Invoice domain-specific OCR corpus generator.

Generates realistic OCR-style multi-line receipt and invoice texts mimicking
PaddleOCR/RapidOCR output: header, vendor, itemizations, quantities, taxes, and grand totals.
"""

import csv
from pathlib import Path
import random
import sys
from typing import List, Dict

DATA_DIR = Path(__file__).resolve().parent
RECEIPT_CSV = DATA_DIR / "receipt_ocr_corpus.csv"

RECEIPT_TEMPLATES: Dict[str, Dict] = {
    "Meals & Dining": {
        "vendors": [
            "Starbucks Coffee", "McDonald's", "Chipotle Mexican Grill", "Panera Bread",
            "Subway Sandwiches", "The Halal Guys", "Panda Express", "Burger King",
            "Wendy's", "Five Guys Burgers & Fries", "Taco Bell", "Shake Shack",
            "Sweetgreen", "Blue Bottle Coffee", "Pret A Manger", "Peet's Coffee",
            "The Capital Grille", "Olive Garden Italian Kitchen", "Texas Roadhouse",
            "Outback Steakhouse", "Dunkin' Donuts", "Buffalo Wild Wings", "Chili's Grill & Bar",
            "Joe's Pizza", "Sushi Nakazawa", "Corner Bakery Cafe", "Nando's PERi-PERi",
            "OM SWEETS PVT. LTD.", "Om Sweets & Snacks", "Haldiram's Sweets & Restaurant",
            "Bikanervala Sweets & Fast Food", "Saravana Bhavan Restaurant", "Sagar Ratna Restaurant",
            "Barbeque Nation", "Karim's Hotel & Restaurant", "Annapurna Hotel & Dining",
            "Paradise Food Court", "Cafe Coffee Day", "Chaayos Cafe", "Chai Point",
            "Royal Sweets & Confectionery", "Punjabi Dhaba & Restaurant", "Ghar Ka Dhaba",
            "Udupi Sri Krishna Bhavan", "Kwality Restaurant & Bakery", "Pind Balluchi Restro",
            "Vaishno Bhojnalaya", "Sweets Corner & Fast Food", "Bakers Square & Confectionery",
            "Swiggy Delivery Restaurant", "Zomato Dine-in Restaurant", "Hotel Royal Grand Restaurant"
        ],
        "items": [
            ("Caffe Latte Grande", 4.95), ("Caramel Macchiato", 5.45), ("Iced Americano", 4.25),
            ("Bacon Gouda Sandwich", 5.75), ("Chicken Burrito Bowl", 11.25), ("Guacamole & Chips", 4.95),
            ("Double Bacon Cheeseburger", 8.99), ("Large French Fries", 3.79), ("Fountain Drink 20oz", 2.49),
            ("Chicken Caesar Salad", 12.50), ("Tomato Basil Soup Cup", 5.25), ("Warm Sourdough Loaf", 4.50),
            ("Crispy Chicken Tenders 4pc", 7.99), ("Spicy Tuna Roll", 10.50), ("Margherita Pizza Slice", 4.50),
            ("Avocado Toast Poached Egg", 13.00), ("Espresso Double Shot", 3.50), ("Cold Brew Coffee Nitro", 5.20),
            ("Grilled Salmon Entree", 24.00), ("Filet Mignon 8oz", 38.00), ("Sparkling Mineral Water", 3.95),
            ("Chocolate Chip Cookie", 2.75), ("Cheesecake Slice", 7.50), ("Draft Craft Beer IPA", 8.00),
            ("DAL MAKHANI", 5.50), ("PLAIN ROTI", 1.25), ("BUTTER ROTI", 1.50),
            ("Tandoori Butter Naan", 2.25), ("Garlic Naan", 2.50), ("Paneer Butter Masala", 6.50),
            ("Shahi Paneer Gravy", 6.25), ("Kadai Paneer", 6.00), ("Chole Bhature 2pc", 4.25),
            ("Pav Bhaji Extra Pav", 4.50), ("Special Veg Thali", 7.99), ("Veg Dum Biryani", 6.75),
            ("Chicken Dum Biryani", 8.99), ("Masala Dosa with Sambar", 4.75), ("Idli Sambar 2pc", 3.50),
            ("Gulab Jamun 2pc", 2.25), ("Rasgulla 2pc", 2.25), ("Kaju Katli Sweets 250g", 6.50),
            ("Motichoor Ladoo 500g", 5.50), ("Sweet Lassi Glass", 2.50), ("Mango Lassi", 2.95),
            ("Special Masala Chai", 1.75), ("Crispy Samosa 2pc", 2.00), ("Jeera Rice Bowl", 3.25),
            ("Boondi Raita", 2.00), ("Mixed Veg Curry", 5.00), ("Matar Paneer", 5.75)
        ],
        "tax_rate": 0.08875,
    },
    "Travel & Logistics": {
        "vendors": [
            "Uber Technologies Inc", "Lyft Inc", "Delta Air Lines", "United Airlines",
            "American Airlines", "Southwest Airlines", "JetBlue Airways", "Shell Oil Station",
            "Chevron Gas Station", "ExxonMobil", "BP Products North America", "Marriott Hotels",
            "Hilton Worldwide", "Hyatt Regency", "Hertz Rent A Car", "Enterprise Rent-A-Car",
            "Avis Car Rental", "Amtrak Rail Passenger", "MTA New York City Transit",
            "Bay Area Rapid Transit (BART)", "ParkMobile LLC", "Yellow Cab Co", "Sunoco Gas"
        ],
        "items": [
            ("UberX Standard Trip", 24.50), ("UberXL Group Ride", 42.00), ("Lyft Standard Ride Fare", 21.30),
            ("Airport Surcharge / Toll", 6.50), ("Passenger Economy Seat Flight", 285.00), ("Checked Baggage Fee 50lbs", 35.00),
            ("Seat Selection Priority Access", 45.00), ("In-flight WiFi Day Pass", 16.00), ("Regular 87 Unleaded Gas 12.5 Gal", 43.75),
            ("Premium 93 Gasoline 15 Gal", 58.50), ("Diesel Fuel Commercial 20 Gal", 78.00), ("Hotel Room Night 1 Standard King", 189.00),
            ("Hotel Room Night 2 Standard King", 189.00), ("State Occupancy Tax / Tourism Fee", 28.50),
            ("Compact Vehicle Rental 2 Days", 110.00), ("Collision Damage Waiver CDW", 38.00), ("Airport Concession Recovery Fee", 14.50),
            ("Amtrak Northeast Regional Coach", 64.00), ("Train Quiet Car Seat Reservation", 15.00), ("Parking Garage Daily Rate", 32.00),
            ("EZPass Toll Plaza Charge", 12.50), ("EV Charging Station 45 kWh", 18.90),
        ],
        "tax_rate": 0.075,
    },
    "Technology & Cloud Services": {
        "vendors": [
            "Amazon Web Services Inc", "Google Cloud Platform", "Microsoft Azure Cloud",
            "GitHub Inc", "OpenAI LLC", "Anthropic PBC", "DigitalOcean LLC",
            "Cloudflare Inc", "Atlassian Inc", "Slack Technologies LLC", "Zoom Video Communications",
            "Datadog Inc", "Vercel Inc", "MongoDB Atlas", "Twilio Inc",
            "Stripe Inc (Billing Fee)", "Adobe Systems Inc", "JetBrains s.r.o.",
            "Postman Inc", "Figma Inc", "Notion Labs Inc", "New Relic Software", "Sentry.io"
        ],
        "items": [
            ("AWS EC2 t3.xlarge Linux Instance", 121.50), ("Amazon S3 Standard Storage 500GB", 11.50),
            ("AWS Relational Database RDS Postgres", 85.00), ("CloudFront Data Transfer Out", 18.20),
            ("Google BigQuery Active Analysis", 45.00), ("Google Cloud Run Container Execution", 28.50),
            ("Azure Virtual Machines D4s_v5", 140.00), ("GitHub Enterprise 5 User Seats", 105.00),
            ("GitHub Copilot Business Monthly Seat", 19.00), ("OpenAI API GPT-4o Token Usage", 65.40),
            ("Anthropic Claude 3.5 Sonnet API Credits", 50.00), ("DigitalOcean Basic Droplet 4GB", 24.00),
            ("Cloudflare Pro Domain Subscription", 20.00), ("Jira Cloud Premium 10 Users", 145.00),
            ("Slack Business+ Monthly Plan 8 Seats", 120.00), ("Zoom Workplace Pro License", 15.99),
            ("Datadog Host Monitoring Infrastructure", 75.00), ("Vercel Team Plan Monthly", 40.00),
            ("MongoDB Atlas Dedicated Cluster M10", 68.00), ("Adobe Creative Cloud All Apps", 59.99),
            ("JetBrains All Products Pack Renewal", 289.00), ("Figma Professional Team 3 Editors", 45.00),
        ],
        "tax_rate": 0.00,  # SaaS is often tax-exempt or separate in B2B
    },
    "Office Supplies & Hardware": {
        "vendors": [
            "Staples The Office Superstore", "Office Depot / OfficeMax", "Best Buy Commercial",
            "Micro Center", "B&H Photo Video", "Amazon Business - Office", "HP Inc Commercial Store",
            "Dell Technologies", "IKEA Business Furniture", "FedEx Office Print Center",
            "The UPS Store Print Services", "Herman Miller Workspaces", "Grainger Industrial Supply",
            "CDW Corporation", "Newegg Business", "Uline Shipping Supplies"
        ],
        "items": [
            ("Multi-Purpose Copy Paper 8.5x11 500ct", 8.99), ("HP 206A Black LaserJet Toner Cartridge", 68.99),
            ("Pilot G2 Gel Pens 0.7mm Black 12pk", 14.50), ("Logitech MX Master 3S Wireless Mouse", 99.99),
            ("Dell 27-inch 4K USB-C Hub Monitor", 349.99), ("Anker USB-C 8-in-1 Hub Adapter", 45.00),
            ("Post-it Super Sticky Notes 3x3 12pk", 16.25), ("Swingline Heavy Duty Desktop Stapler", 22.50),
            ("SanDisk 1TB Extreme Portable SSD", 109.99), ("High-Back Ergonomic Mesh Desk Chair", 249.00),
            ("Heavy Duty Cardboard Shipping Boxes 25pk", 32.00), ("Thermal Receipt Paper Rolls 50pk", 28.50),
            ("Presentation Spiral Binding 5 Copies", 45.00), ("Velcro Cable Management Straps 50ct", 9.99),
            ("Surge Protector Power Strip 8 Outlets", 24.99), ("Whiteboard 48x36 Magnetic Aluminum", 65.00),
        ],
        "tax_rate": 0.0825,
    },
    "Utilities & Telecom": {
        "vendors": [
            "AT&T Commercial Mobility", "Verizon Business Wireless", "T-Mobile for Business",
            "Comcast Xfinity Business", "Charter Spectrum Communications", "Pacific Gas & Electric (PG&E)",
            "Consolidated Edison of NY", "Southern California Edison (SCE)", "City Water & Sewer Authority",
            "Waste Management WM", "National Grid Gas Utility", "CenturyLink / Lumen",
            "Duke Energy Carolinas", "Dominion Energy", "Florida Power & Light (FPL)", "Cox Business"
        ],
        "items": [
            ("Commercial High-Speed Internet 1Gbps", 129.99), ("Business Voice VoIP Line Service", 35.00),
            ("Unlimited 5G Mobile Data Plan 4 Lines", 180.00), ("Static IP Block Allocation /29", 25.00),
            ("Electricity Generation Charge 1250 kWh", 195.40), ("Distribution & Transmission Surcharge", 42.10),
            ("Commercial Gas Consumption 85 Therms", 98.60), ("Municipal Water Consumption 4200 Gal", 52.30),
            ("Sanitary Sewer Treatment Service", 38.40), ("Commercial Waste & Recycling 4-Yard Dumpster", 165.00),
            ("Regulatory Cost Recovery Surcharge", 4.50), ("Federal Universal Service Fund Fee", 6.80),
            ("State Infrastructure Modernization Fee", 8.20), ("Equipment Rental Fiber Modem", 15.00),
        ],
        "tax_rate": 0.065,
    },
    "Healthcare & Medical": {
        "vendors": [
            "CVS Pharmacy", "Walgreens Pharmacy", "Quest Diagnostics Inc",
            "LabCorp Clinical Laboratory", "MinuteClinic Diagnostic Care", "CityMD Urgent Care NY",
            "Kaiser Permanente Medical Group", "Metropolitan Dental Associates", "Pearle Vision Eye Care",
            "Rite Aid Pharmacy", "Concentra Urgent Care & Occupational", "Aspen Dental Management",
            "UnitedHealthcare Patient Copay", "Duane Reade Pharmacy", "Memorial Health System"
        ],
        "items": [
            ("Prescription Medication Rx #492810", 28.00), ("Amoxicillin 500mg 30 Capsules", 15.50),
            ("Comprehensive Metabolic Blood Panel", 85.00), ("Lipid Panel Diagnostic Screen", 42.00),
            ("Rapid Strep A / COVID Antigen Dual Test", 35.00), ("Physician Consultation Specialist Copay", 40.00),
            ("Urgent Care Clinic Standard Visit Fee", 125.00), ("Digital Dental Bitewing X-Rays 4 Films", 75.00),
            ("Comprehensive Adult Dental Cleaning", 95.00), ("Comprehensive Eye Examination", 85.00),
            ("Prescription Contact Lenses 6-Month Supply", 140.00), ("First Aid Adhesive Bandages Box 100", 8.99),
            ("Ibuprofen 200mg Pain Reliever 200ct", 11.49), ("Sterile Alcohol Prep Pads 100ct", 4.50),
            ("Digital Upper Arm Blood Pressure Monitor", 49.99), ("Annual Influenza Vaccine Administration", 30.00),
        ],
        "tax_rate": 0.04,
    },
    "Retail & Groceries": {
        "vendors": [
            "Walmart Supercenter", "Costco Wholesale", "Target Store",
            "Whole Foods Market", "Trader Joe's", "The Kroger Co",
            "Safeway Supermarket", "Aldi Foods", "The Home Depot",
            "Lowe's Home Improvement", "TJ Maxx & HomeGoods", "Amazon Prime Retail",
            "Publix Super Markets", "H-E-B Grocery Co", "Wegmans Food Markets",
            "AVENUE SUPERMARTS LTD", "Avenue Supermarts Ltd (DMart)", "DMart Supermarket",
            "D-Mart Hypermarket", "D Mart Store", "Reliance Smart Bazaar", "Reliance Fresh Supermarket",
            "Big Bazaar Hypermarket", "More Supermarket Store", "Spencers Retail Supermarket",
            "Nature's Basket Grocery", "Blinkit Quick Commerce", "Zepto Daily Groceries",
            "Swiggy Instamart Store", "BigBasket Online Supermarket", "Tata Star Bazaar",
            "Heritage Fresh Supermarket", "Ratnadeep Supermarket Store"
        ],
        "items": [
            ("Whole Milk 1 Gallon Grade A", 3.89), ("Organic Brown Eggs Large 1 Dozen", 4.49),
            ("Whole Wheat Sandwich Bread 24oz", 3.29), ("Boneless Skinless Chicken Breast 3lb", 12.99),
            ("Fresh Hass Avocados 4-Pack", 4.99), ("Bananas Organic Fresh 2.5lb", 2.15),
            ("Honeycrisp Apples 3lb Bag", 5.99), ("Laundry Detergent Liquid 100 Loads", 19.99),
            ("Paper Bath Tissue Mega Rolls 12pk", 14.50), ("Paper Towels Double Rolls 8pk", 12.99),
            ("Dishwasher Detergent ActionPacs 60ct", 16.49), ("Trash Bags 13 Gallon Drawstring 80ct", 13.99),
            ("Sparkling Seltzer Water Variety 24pk", 9.99), ("Roasted Almonds Whole Salted 16oz", 7.99),
            ("Organic Extra Virgin Olive Oil 1 Liter", 11.99), ("Ground Coffee Arabica Dark Roast 12oz", 8.49),
            ("Frozen Mixed Berries Organic 32oz", 9.49), ("Cheddar Cheese Block Sharp 16oz", 5.29),
            ("MODERN MILK PLUS BR", 30.00), ("MILKY MIST UHT -1lt", 72.00), ("JERSEY CURD PO-425g", 38.00),
            ("WAGHBAKRI STRO-250g", 142.00), ("GOLD DROP SUNFL-1lt", 142.00), ("BAMBIND ROASTE-400g", 55.00),
            ("PARLE REAL ELA-400g", 65.00), ("ASAL IDLY & DOS-1kg", 47.50), ("MILKY MIST TBL -10g", 66.00),
            ("MCCAIN MASALA -375g", 117.25), ("EPIGAMIA CHOC-180ml", 20.00), ("PARLE KRACKJ-178.4g", 36.00),
            ("NESTLE MUNCH-17.4g", 9.30), ("Aashirvaad Shudh Chakki Atta 5kg", 245.00),
            ("Fortune Sunlite Refined Sunflower Oil 1L", 145.00), ("Tata Salt Iodized 1kg", 28.00),
            ("Madhur Pure Sugar 1kg", 48.00), ("India Gate Basmati Rice 5kg", 450.00),
            ("Tata Sampann Toor Dal 1kg", 165.00), ("Surf Excel Detergent Powder 1kg", 185.00),
            ("Vim Dishwash Gel 500ml", 120.00), ("Maggi 2-Minute Noodles 4-Pack", 56.00),
            ("Britannia Good Day Butter Cookies 200g", 40.00), ("Colgate MaxFresh Toothpaste 150g", 110.00)
        ],
        "tax_rate": 0.05,
    },
}


def generate_receipt_records(samples_per_category: int = 750) -> List[Dict[str, str]]:
    """Generate realistic OCR document records with itemized lines and headers."""
    random.seed(1337)
    records: List[Dict[str, str]] = []

    for category, config in RECEIPT_TEMPLATES.items():
        vendors = config["vendors"]
        item_pool = config["items"]
        tax_rate = config["tax_rate"]

        for _ in range(samples_per_category):
            vendor = random.choice(vendors)
            # Pick 1 to 5 random items for this receipt
            num_items = random.randint(1, 5)
            selected_items = random.sample(item_pool, min(num_items, len(item_pool)))

            item_lines = []
            subtotal = 0.0
            for name, base_price in selected_items:
                qty = random.choices([1, 2, 3], weights=[0.8, 0.15, 0.05])[0]
                line_price = round(base_price * qty, 2)
                subtotal += line_price
                if qty == 1:
                    item_lines.append(f"{name} ${line_price:.2f}")
                else:
                    item_lines.append(f"{qty}x {name} @ ${base_price:.2f} = ${line_price:.2f}")

            tax = round(subtotal * tax_rate, 2)
            total = round(subtotal + tax, 2)

            # Build OCR-like multi-line text representation
            receipt_date = f"2026-0{random.randint(1, 9)}-{random.randint(10, 28)}"
            receipt_id = f"REC-{random.randint(10000, 99999)}"
            joined_items = " ; ".join(item_lines)

            # Formatting style variation
            style = random.randint(1, 3)
            if style == 1:
                text = f"{vendor.upper()}\nDATE: {receipt_date} ID: {receipt_id}\nITEMS: {joined_items}\nSUBTOTAL: ${subtotal:.2f} TAX: ${tax:.2f} TOTAL: ${total:.2f}"
            elif style == 2:
                text = f"STORE: {vendor} | {joined_items} | AMT: ${total:.2f} | PAID"
            else:
                text = f"INVOICE FROM {vendor} ON {receipt_date}\n{joined_items}\nTOTAL DUE: ${total:.2f}"

            records.append({
                "text": text,
                "vendor_name": vendor,
                "amount": f"{total:.2f}",
                "category": category,
                "source": "receipt_ocr_corpus",
            })

    return records


def save_receipt_dataset(records: List[Dict[str, str]], filepath: Path) -> None:
    """Save records to CSV."""
    filepath.parent.mkdir(parents=True, exist_ok=True)
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["text", "vendor_name", "amount", "category", "source"])
        writer.writeheader()
        writer.writerows(records)
    print(f"[SUCCESS] Saved {len(records)} receipt OCR records to {filepath}")


if __name__ == "__main__":
    count = 750  # 750 * 7 categories = 5,250 receipt rows
    if len(sys.argv) > 1:
        count = int(sys.argv[1])
    dataset = generate_receipt_records(samples_per_category=count)
    save_receipt_dataset(dataset, RECEIPT_CSV)
