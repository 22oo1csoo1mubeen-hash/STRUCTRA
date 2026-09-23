"""Generate 10000 realistic expense text & category dataset entries."""

import random
from pathlib import Path

OUTPUT_PATH = Path(__file__).resolve().parent.parent / "data" / "expenses_dataset.csv"

# 15 Rich Expense Categories
CATEGORIES = {
    "Food & Dining": [
        ("Starbucks", ["Iced Caramel Macchiato", "Espresso Roast", "Butter Croissant", "Cold Brew Coffee", "Ham Cheese Panini", "Caffe Latte", "Vanilla Frappuccino", "Avocado Toast", "Chai Tea Latte", "Blueberry Muffin"]),
        ("McDonalds", ["Big Mac Meal", "Quarter Pounder Cheese", "10 Piece Nuggets", "Large French Fries", "Egg McMuffin Breakfast", "Oreo McFlurry", "Filet-O-Fish", "Spicy Chicken Sandwich"]),
        ("Dominos Pizza", ["Large Pepperoni Pizza", "Cheesy Breadstick", "Buffalo Wings 8pc", "Thin Crust Veggie Supreme", "Chocolate Lava Cake", "Italian Sausage Pizza", "Garlic Parmesan Bites"]),
        ("Subway", ["Footlong Turkey Sub", "6 inch Italian BMT", "Tuna Salad Sub", "Meatball Marinara", "Chocolate Chip Cookies", "Veggie Delite Sub", "Chicken Bacon Ranch Wrap"]),
        ("Chipotle Mexican Grill", ["Chicken Burrito Bowl", "Steak Burrito Guacamole", "Carnitas Tacos 3pc", "Chips Fresh Salsa", "Barbacoa Salad Bowl", "Cheese Quesadilla"]),
        ("Burger King", ["Whopper Extra Cheese", "Chicken Royale Meal", "Onion Rings Large", "Hersheys Sundae Pie", "Double Cheeseburger", "Impossible Whopper"]),
        ("Dunkin Donuts", ["Dozen Assorted Donuts", "Iced Coffee Cream", "Boston Kreme Donut", "Bacon Egg Cheese Bagel", "Hash Browns 6pc", "Frozen Coffee"]),
        ("KFC", ["8 Piece Bucket Original", "Zinger Burger Combo", "Mashed Potatoes Gravy", "Coleslaw Medium", "Popcorn Chicken Large", "Biscuits 4pc"]),
        ("Pizza Hut", ["Super Supreme Pizza", "Stuffed Crust Pepperoni", "Garlic Breadsticks", "WingStreet Boneless Wings", "Meatballs Marinara Pasta"]),
        ("Taco Bell", ["Crunchy Taco Supreme", "Cheesy Gordita Crunch", "Bean Burrito", "Nachos BellGrande", "Doritos Locos Tacos", "Cinnamon Twists"]),
        ("Olive Garden", ["Tour of Italy Dinner", "Chicken Alfredo Fettuccine", "Breadsticks Salad Soup", "Chicken Parmigiana", "Tiramisu Slice"]),
        ("Panera Bread", ["Broccoli Cheddar Soup", "Frontega Chicken Sandwich", "You Pick Two Combo", "Mac and Cheese Bowl", "Bagel Cream Cheese"]),
        ("Cheesecake Factory", ["Glazed Salmon Dinner", "Chicken Madeira", "Original Cheesecake", "Avocado Eggrolls", "Factory Burger"]),
        ("Shake Shack", ["ShackBurger Double", "Crinkle Cut Fries", "Chocolate Milkshake", "SmokeShack Burger", "Chicken Shack Sandwich"]),
        ("Five Guys", ["Bacon Cheeseburger", "Cajun Fries Large", "Vanilla Milkshake", "Kosher Hot Dog"]),
        ("Panda Express", ["Orange Chicken Plate", "Beijing Beef Chow Mein", "Honey Walnut Shrimp", "Fried Rice Egg Roll"]),
        ("Sweetgreen", ["Harvest Bowl Warm Grains", "Kale Caesar Salad", "Guacamole Greens Salad", "Crispy Rice Bowl"]),
        ("Texas Roadhouse", ["6oz Sirloin Steak", "Ribeye Loaded Potato", "Bone-In Ribs Half Rack", "Rattlesnake Bites"]),
        ("Buffalo Wild Wings", ["Traditional Wings Medium", "Boneless Wings Garlic Parm", "Onion Rings Basket", "Ultimate Nachos"]),
        ("Cracker Barrel", ["Old Timer Breakfast", "Country Fried Steak", "Hashbrown Casserole", "Chicken n Dumplins"])
    ],
    "Travel & Transport": [
        ("Uber", ["Trip Fare Downtown", "UberX Airport Transfer", "Uber Comfort Executive", "Uber Green Electric", "UberXL Group Transport"]),
        ("Lyft", ["Standard Passenger Ride", "Lyft XL Airport Express", "Lyft Pink Priority", "Lyft Shared Transit"]),
        ("Delta Air Lines", ["Roundtrip Economy Ticket", "First Class Flight Seat", "Checked Baggage Fee", "Main Cabin Seat Upgrade"]),
        ("American Airlines", ["Domestic Flight Ticket", "Basic Economy Roundtrip", "Preferred Seat Selection", "In-Flight Wi-Fi Pass"]),
        ("United Airlines", ["Nonstop Flight Ticket", "Economy Plus Legroom", "Checked Bag Allowance", "United Club Pass"]),
        ("Shell Gas Station", ["Unleaded 87 Fueling", "V-Power Premium Diesel", "Gasoline Pump Fill", "Convenience Store Snacks"]),
        ("Chevron", ["Supreme 93 Fueling", "Regular Diesel Gas", "Techron Fuel Injection", "Car Wash Express"]),
        ("BP Oil", ["Invigorate Gasoline", "Auto Diesel Fueling", "Express Car Wash", "Coffee Snack Shop"]),
        ("Enterprise Rent-A-Car", ["Daily SUV Vehicle Rental", "Sedan Lease Fullsize", "Damage Waiver Insurance", "Unlimited Mileage Addon"]),
        ("Hertz", ["Weekly Economy Car Lease", "Luxury Convertible Rental", "Gold Plus Booking", "Prepaid Gas Tank Fill"]),
        ("Avis Car Rental", ["Midsize Sedan Rental", "Airport Pickup Dropoff", "Loss Damage Protection"]),
        ("Amtrak", ["Regional Express Ticket", "Acela Business Class Seat", "Quiet Car Seat Booking"]),
        ("ExxonMobil", ["Synergy Extra Gasoline", "Diesel Fuel Pump Fill", "Motor Oil Synthetic 1Qt"]),
        ("Metra Commuter Rail", ["Monthly Transit Pass", "10-Ride Train Pass", "Weekend Unlimited Pass"]),
        ("NYC Transit MetroCard", ["30-Day Unlimited Subway Pass", "Refill Fare Transit", "Express Bus Single Ride"]),
        ("BART Bay Area Transit", ["Clipper Card Refill", "Airport Station Fare", "Commuter Rail Ticket"]),
        ("Alaska Airlines", ["Nonstop Flight Ticket", "First Class Cabin Seat", "In-flight Meal Pack"]),
        ("Southwest Airlines", ["Anytime Roundtrip Flight", "EarlyBird Check-in Addon", "Business Select Seat"]),
        ("Budget Car Rental", ["Compact Car Daily Lease", "Roadside Assistance Protection", "GPS Device Rental"]),
        ("National Car Rental", ["Emerald Club Selection", "Fullsize SUV Rental", "Loss Damage Protection"])
    ],
    "Software & Cloud Services": [
        ("AWS Amazon Web Services", ["EC2 Compute Billing", "S3 Storage Bucket Transfer", "RDS PostgreSQL Database Usage", "CloudFront CDN Data", "Lambda Serverless Executions"]),
        ("GitHub", ["Enterprise Team License", "GitHub Copilot Developer", "Actions CI/CD Runner Minutes", "LFS Large File Storage"]),
        ("OpenAI", ["API Credits Usage Billing", "ChatGPT Plus Subscription", "GPT-4o Token Billing", "Embeddings API Usage"]),
        ("Google Workspace", ["Business Plus Email Storage", "Enterprise Workspace Seats", "Google Drive Additional Capacity"]),
        ("Microsoft 365", ["Business Standard License", "Azure Cloud DevOps Usage", "Teams Phone System License", "SharePoint Storage Addon"]),
        ("Zoom Video Communications", ["Pro Host Meeting License", "Zoom Webinars 500 Attendees", "Zoom Phone Domestic Unlimited"]),
        ("Slack Technologies", ["Business+ User Seat License", "Enterprise Grid Workspace", "Slack Huddle Recording"]),
        ("Vercel", ["Pro Team Deployment Hosting", "Serverless Edge Functions", "Custom Domain SSL Certificate", "Web Analytics Plus"]),
        ("Supabase", ["Pro Cloud Database Subscription", "Compute Add-on Instance Size", "Storage Bucket Bandwidth Transfer"]),
        ("Datadog", ["Infrastructure Metrics Monitoring", "APM Tracing Log Management", "Synthetic Test Automation", "Dashboard Users"]),
        ("Adobe Creative Cloud", ["All Apps Individual License", "Photoshop Illustrator Acrobat Pro", "Stock Photos Credit Pack"]),
        ("Atlassian", ["Jira Software Cloud License", "Confluence Knowledge Base", "Bitbucket Cloud CI Pipeline"]),
        ("Figma", ["Professional Team Seat License", "Organization Design System", "FigJam Whiteboard User License"]),
        ("Heroku", ["Production Dyno Hosting", "Heroku Postgres Database", "Redis Cache Addon"]),
        ("Docker", ["Docker Hub Team Subscription", "Container Image Security", "Docker Desktop Enterprise"]),
        ("Cloudflare", ["Pro Plan Web Security CDN", "Workers KV Storage Usage", "Registrar Domain Renewal", "DDoS Protection Premium"]),
        ("Twilio", ["SMS Voice API Communications", "SendGrid Email API Pro", "Lookup Carrier Intelligence API"]),
        ("Stripe", ["Processing Fee Chargeback", "Stripe Billing Subscriptions", "Radar Fraud Prevention"]),
        ("Sentry", ["Error Tracking Crash Reporting", "Performance APM Tracing", "Session Replay Monitoring"]),
        ("Linear", ["Standard Team Workspace", "Enterprise Product Management", "Integrations API Access"])
    ],
    "Office Supplies & Equipment": [
        ("Staples", ["Multipurpose Copy Paper 20lb", "HP Black Toner Cartridge Laserjet", "Bic Ballpoint Pens 60 Pack", "Heavy Duty Binders 2 Inch", "Mesh Ergonomic Office Chair"]),
        ("Office Depot", ["High Yield Ink Cartridge Black", "Post-it Sticky Notes 12 Pack", "Manila File Folders 100 Pack", "Perforated Writing Pads Legal", "Cross-Cut Paper Shredder"]),
        ("Walmart", ["Spiral Notebooks College Ruled", "Stainless Steel Scissors 8 Inch", "Mechanical Pencils 0.7mm 24 Pack", "Glue Sticks School Pack", "Dry Erase Markers Assorted"]),
        ("Target", ["Desk Organizer Wire Mesh", "Scotch Magic Tape 3 Rolls", "Avery Printable Mailing Labels", "Five Star 3 Subject Notebook", "Sharpie Permanent Markers Fine Point"]),
        ("OfficeMax", ["Heavy Duty Packing Tape Dispenser", "Whiteboard Eraser Cleaner Spray", "Metal Paper Clips Jumbo 1000 Box", "Clorox Disinfecting Wipes Surface", "Heavy Duty Stapler with Staples"]),
        ("Amazon Basics", ["Printer Paper 5000 Sheets Box", "Adjustable Monitor Stand Riser Mesh", "Standard Paper Clips Zinc Coated 1000", "Thermal Laminating Pouches Letter", "Wireless Ergonomic Mouse 2.4GHz"]),
        ("Best Buy", ["Logitech MX Master 3S Mouse", "Dell 27 Inch 4K UHD Monitor", "Anker 65W USB-C Charger Adapter", "High Speed HDMI 2.1 Cable 6ft", "CyberPower 1500VA Battery UPS"]),
        ("Uline", ["Corrugated Cardboard Boxes 12x12x12", "Bubble Wrap Cushioning Roll 100ft", "Industrial Stretch Wrap Film", "Poly Mailers Shipping Envelopes 100 Pack", "Shipping Label Tape Rolls Heavy Duty"]),
        ("Quill", ["Commercial Copy Paper 10 Reams", "Fellowes Cross-Cut Paper Shredder", "Logitech Wired USB Keyboard Black", "Desk Pad Calendar Monthly Planner"]),
        ("CDW", ["Cisco Catalyst Managed Switch 24 Port", "Lenovo ThinkPad Docking Station", "APC Smart-UPS Uninterruptible Power", "Samsung 1TB NVMe M.2 SSD"])
    ],
    "Utilities & Bills": [
        ("ConEdison", ["Monthly Electric Utility Power Bill", "Gas Heating Service Electric Usage", "Commercial Electric Supply Account"]),
        ("AT&T", ["Business Unlimited Mobile Wireless Line", "Fiber Internet 1000Mbps Service Bill", "Digital Landline Phone Service Account"]),
        ("Verizon", ["5G Business Unlimited Smartphone Plan", "Fios Gigabit Fiber Connection Internet", "LTE Mobile Hotspot Data Plan"]),
        ("Comcast Xfinity", ["Business Broadband Internet 500Mbps", "Voice Edge VoIP Business Phone Service", "Xfinity TV Station Public Cable"]),
        ("PG&E Pacific Gas Electric", ["Monthly Commercial Gas Electric Bill", "Natural Gas Heating Distribution Meter", "Clean Energy Solar Power Assessment"]),
        ("City Water Department", ["Municipal Water Sewage Usage Service", "Sanitation Waste Management Utility Bill", "Commercial Water Meter Consumption"]),
        ("T-Mobile", ["Business Unlimited 5G Smartphone Lines", "SyncUP Fleet Vehicle Tracking Device", "Mobile Internet Hotspot Data Line"]),
        ("Spectrum", ["Business Internet Ultra 600Mbps Connection", "Business Voice Landline Phone Service", "Commercial Cable TV Broadcast Channel"]),
        ("Duke Energy", ["Commercial Electric Energy Usage Bill", "Industrial Power Transformer Account", "Street Lighting Maintenance Service"]),
        ("Waste Management WM", ["Commercial Trash Dumpster Rental Collection", "Recycling Waste Pickup Monthly Service", "Hazardous Material Waste Disposal"]),
        ("National Grid", ["Natural Gas Delivery Service Monthly Bill", "Electric Distribution Supply Account", "Pipeline Safety Inspection Assessment"]),
        ("Southern California Edison SCE", ["Commercial Electricity Tariff Usage", "Solar Net Energy Metering Adjustment", "Peak Demand Power Charge"]),
        ("Consolidated Water", ["Commercial Fresh Water Supply Consumption", "Sewer Service Treatment Discharge", "Backflow Preventer Testing Inspection"])
    ],
    "Healthcare & Pharmacy": [
        ("CVS Pharmacy", ["Prescription Medication Rx Refill", "Advil Ibuprofen 200mg Pain Reliever", "Adhesive Bandages 100 Pack", "Neosporin Antibiotic Ointment Tube", "Digital Oral Thermometer Fever Reader"]),
        ("Walgreens", ["Tylenol Extra Strength Acetaminophen", "Nature Made Multivitamin Softgels", "Claritin 24-Hour Allergy Relief", "First Aid Kit Emergency Supplies", "Omron Upper Arm Blood Pressure Monitor"]),
        ("Rite Aid", ["CVS Health Cough Drops Cherry", "Eye Drops Lubricant Redness Relief", "Hydrogen Peroxide Antiseptic Liquid", "Flonase Allergy Relief Nasal Spray", "Heating Pad Electric Muscle Relief"]),
        ("Quest Diagnostics", ["Routine Complete Blood Count CBC Test", "Comprehensive Metabolic Panel Bloodwork", "Lipid Panel Cholesterol Screening", "Thyroid Stimulating Hormone TSH Lab"]),
        ("Labcorp", ["Laboratory Specialist Diagnostic Testing", "Urinalysis Diagnostic Culture Screen", "Hemoglobin A1c Diabetes Blood Test", "Vitamin D 25-Hydroxy Lab Assessment"]),
        ("City Medical Clinic", ["Primary Care Physician Consultation", "Annual Physical Wellness Examination", "Urgent Care Outpatient Visit Co-pay", "Diagnostic X-Ray Examination Chest"]),
        ("Mayo Clinic", ["Specialist Consultation Outpatient Visit", "MRI Diagnostic Brain Imaging Scan", "Cardiology Electrocardiogram ECG Test", "Orthopedic Physical Therapy Evaluation"]),
        ("Kaiser Permanente", ["Doctor Visit Co-pay General Practice", "Prescription Copayment Specialty Meds", "Outpatient Surgical Procedure Facility", "Diagnostic Ultrasound Scan Examination"]),
        ("Wal-Mart Pharmacy", ["Generic Prescription Medication Refill", "Blood Glucose Monitoring Meter Kit", "Test Strips Diabetic Care 50 Count", "Omega 3 Fish Oil Concentrated Softgels"]),
        ("GoodRx", ["Discounted Prescription Medication Refill", "Pharmacy Savings Coupon Benefit", "Maintenance Medication Annual Supply"])
    ],
    "Entertainment & Events": [
        ("AMC Theatres", ["IMAX Cinema Ticket Pass", "Large Popcorn Soda Combo Meal", "Movie Ticket Adult Evening", "Dolby Cinema Recliner Seat"]),
        ("Regal Cinemas", ["Standard Movie Ticket Admission", "Nachos Candy Concession Deal", "RPX Premium Cinema Experience"]),
        ("Ticketmaster", ["Concert Ticket Event Admission", "Stadium Sports Game Pass", "Facility Service Processing Fee", "VIP Reserved Ticket Seat"]),
        ("Live Nation", ["Music Festival Weekend Pass", "Live Performance Ticket Reservation", "Concert Merchandise Shirt"]),
        ("Spotify", ["Premium Individual Monthly Subscription", "Family Plan Music Streaming", "Duo Subscription Student Discount"]),
        ("Netflix", ["Premium 4K Ultra HD Plan", "Standard HD Monthly Subscription", "Extra Member Slot Fee"]),
        ("Hulu", ["No Ads Streaming Subscription", "Live TV Bundle Disney+ ESPN+", "Addon Premium Channel Access"]),
        ("Disney+", ["Annual Premium Streaming Subscription", "Trio Premium Bundle Plan", "Premier Access Movie Rental"]),
        ("Eventbrite", ["Professional Workshop Conference Pass", "Networking Event Ticket Admission", "Seminar Registration Fee"]),
        ("PlayStation Network", ["PS Plus Extra 12-Month Membership", "Digital Game Store Purchase", "In-Game Currency Addon Pack"])
    ],
    "Maintenance & Repairs": [
        ("Jiffy Lube", ["Signature Service Synthetic Oil Change", "Engine Air Filter Replacement", "Serpentine Belt Inspection Replacement", "Windshield Wiper Blade Pair Install"]),
        ("AutoZone", ["Duralast 12V Automotive Battery", "Brake Pads Front Ceramic Set", "Castrol Full Synthetic Motor Oil 5 Qt", "Spark Plugs Platinum 4 Pack"]),
        ("Home Depot", ["DeWalt 20V Max Cordless Drill Kit", "Ryobi Pressure Washer 2000 PSI", "Benjamin Moore Interior Paint 1 Gal", "Werner 6ft Fiberglass Stepladder"]),
        ("Lowes", ["Craftsman Socket Wrench Tool Set", "Husky Heavy Duty Workbench", "LED Recessed Ceiling Lights 6 Pack", "Pipe Wrench Adjustable Plumbing"]),
        ("Pep Boys", ["Tire Rotation Wheel Alignment Service", "Front Suspension Strut Replacement", "Brake Fluid Flush Service", "Radiator Coolant Flush Service"]),
        ("Discount Tire", ["Michelin Defender All-Season Tire 4 Pack", "Tire Mounting Balancing Disposal", "Tire Pressure Sensor TPMS Replacement"]),
        ("Ace Hardware", ["WD-40 Multi-Use Lubricant Spray", "Gorilla Heavy Duty Construction Adhesive", "Stanley Measuring Tape 25 Foot", "Plumbers Snake Drain Cleaner"]),
        ("Sears Auto Center", ["Wheel Alignment 4-Wheel Precision", "A/C Recharge System Refrigerant", "Transmission Fluid Service Flush"])
    ],
    "Marketing & Advertising": [
        ("Google Ads", ["Search Network Campaign Clicks", "Display Network Banner Advertising", "YouTube Video Ad Impressions", "Performance Max Campaign Ad Spend"]),
        ("Meta Facebook Ads", ["Instagram Sponsored Post Campaign", "Facebook Feed Lead Generation Ads", "Audience Network Conversions", "Meta Pixel Retargeting Ads"]),
        ("LinkedIn Ads", ["Sponsored Content B2B Campaign", "InMail Sponsored Messaging", "Text Ads Lead Gen Form Submissions"]),
        ("TikTok Ads", ["In-Feed Video Ad Impressions", "Spark Ads Creator Promotion", "TopView Takeover Ad Campaign"]),
        ("Twitter X Ads", ["Promoted Posts Engagement Campaign", "Follower Growth Campaign Ads", "Trend Takeover Advertising"]),
        ("HubSpot", ["Marketing Hub Professional Tier", "Sales CRM Enterprise Subscription", "CMS Hub Web Hosting Tools"]),
        ("Mailchimp", ["Standard Email Marketing Plan", "Transactional Email API Credits", "Automated Customer Journey Builder"]),
        ("Semrush", ["Guru SEO Competitor Analytics Plan", "Keyword Rank Tracking Subscription", "Site Audit Backlink Crawler"]),
        ("Ahrefs", ["Advanced SEO Keyword Research Tool", "Site Explorer Domain Rating Tracker", "Content Explorer Search Tool"])
    ],
    "Professional & Legal Services": [
        ("Deloitte", ["Financial Audit Accounting Services", "Corporate Tax Compliance Advisory", "Management Consulting Retainer"]),
        ("PwC PricewaterhouseCoopers", ["Risk Assurance Advisory Retainer", "Transaction Tax Structuring Services", "Regulatory Compliance Audit"]),
        ("EY Ernst & Young", ["Enterprise Risk Management Consulting", "Global Tax Advisory Retainer", "M&A Due Diligence Advisory"]),
        ("KPMG", ["Statutory Financial Statement Audit", "Cybersecurity Advisory Services", "Transfer Pricing Tax Analysis"]),
        ("LegalZoom", ["LLC Business Formation Filing Fee", "Registered Agent Annual Service", "Trademark Registration Filing"]),
        ("Rocket Lawyer", ["Legal Document Template Access", "Attorney On-Call Advice Consultation", "Corporate Resolution Drafting"]),
        ("Clio", ["Legal Practice Management Software", "Time Tracking Client Billing Portal", "Trust Accounting Compliance"]),
        ("DocuSign", ["Business Pro eSignature Plan", "Envelope Quota Extension Pack", "Identity Verification API Access"])
    ],
    "Groceries & Supermarkets": [
        ("Whole Foods Market", ["Organic Whole Milk Gallon", "Fresh Organic Bananas Bunch", "Wild Caught Salmon Fillet", "Artisanal Sourdough Bread", "Extra Virgin Olive Oil Bottle"]),
        ("Trader Joes", ["Mandarin Orange Chicken Frozen", "Everything Bagel Sesame Seasoning", "Organic Baby Spinach Salad", "Dark Chocolate Peanut Butter Cups", "Cold Brew Coffee Concentrate"]),
        ("Kroger Supermarket", ["Private Selection Honey Ham", "Cage Free Grade A Eggs Dozen", "Shredded Cheddar Cheese 16oz", "Fresh Gala Apples 3lb Bag", "Organic Greek Yogurt Vanilla"]),
        ("Safeway Supermarket", ["Signature Select Wheat Bread", "Boneless Skinless Chicken Breast", "Fresh Strawberries 1lb Package", "Sparkling Water 12 Pack Cans"]),
        ("Costco Wholesale", ["Kirkland Signature Paper Towels 12 Roll", "Rotisserie Chicken Whole", "Organic Extra Virgin Olive Oil 2L", "Purified Drinking Water 40 Bottle Case"])
    ],
    "Real Estate & Rent": [
        ("Greystar Real Estate", ["Monthly Apartment Rent Payment", "Reserved Parking Space Lease", "Pet Rent Monthly Fee", "Community Amenity Maintenance Fee"]),
        ("Lincoln Property Co", ["Residential Suite Lease Payment", "Building Maintenance Fee", "Tenant Utility Submeter Charge"]),
        ("CBRE Commercial", ["Office Space Monthly Lease", "Common Area Maintenance CAM Fee", "Commercial Property Management Charge"]),
        ("JLL Jones Lang LaSalle", ["Commercial Real Estate Rent Invoice", "Building Operating Expenses Adjustment", "Retail Space Lease Payment"])
    ],
    "Insurance & Financial Fees": [
        ("Geico Insurance", ["Auto Vehicle Insurance Premium", "Comprehensive Collision Coverage", "Monthly Vehicle Policy Renewal"]),
        ("State Farm Insurance", ["Homeowners Policy Premium Invoice", "Auto Insurance Liability Policy", "Personal Umbrella Policy Premium"]),
        ("Allstate Insurance", ["Property Casualty Insurance Premium", "Commercial Liability Insurance Policy"]),
        ("JPMorgan Chase Bank", ["Monthly Checking Account Service Fee", "Wire Transfer International Fee", "Commercial Overdraft Protection Charge"]),
        ("Bank of America", ["Corporate Credit Card Annual Fee", "Merchant Processing Monthly Service Fee", "International Transaction Fee"])
    ],
    "Telecommunications & Internet": [
        ("AT&T Fiber", ["Gigabit Fiber Internet Monthly Bill", "Wi-Fi Gateway Equipment Rental Fee", "Static IP Address Block Monthly"]),
        ("Verizon Fios", ["1000Mbps Fiber Internet Service", "Fios TV Ultimate HD Channel Package", "Digital Home Phone Line"]),
        ("Comcast Business", ["Business Internet 1 Gig Line", "VoIP Business Voice Lines 5 Seats", "Static IP Address Subnet"]),
        ("CenturyLink Lumen", ["Dedicated Fiber Internet Line", "Business Broadband DSL Service", "SIP Trunking Voice Channel"])
    ],
    "Education & Subscriptions": [
        ("Coursera", ["Specialization Monthly Subscription", "Professional Certificate Course Fee", "Coursera for Business User License"]),
        ("Udemy", ["Online Video Course Purchase", "Python Data Science Masterclass", "AWS Solutions Architect Certification Course"]),
        ("LinkedIn Learning", ["Monthly Unlimited Learning Access", "Enterprise Skill Training Subscription"]),
        ("Harvard Business Review", ["HBR Digital Subscription Annual", "Case Study PDF Download License", "Executive Leadership Magazine"]),
        ("Wall Street Journal WSJ", ["Digital News Unlimited Access", "Print Weekend Newspaper Delivery Subscription"])
    ]
}

NUMERIC_MODIFIERS = [
    "#INV-{}", "Ref#{}", "Order #{}", "Receipt #{}", "Txn ID: {}", 
    "Qty: {}", "Total: ${}.00", "Total: ${:.2f}", "₹{},000", "Store #{}"
]

def generate_10000_entries():
    rows = []
    target_count = 10000
    cat_names = list(CATEGORIES.keys())
    
    print(f"Generating {target_count} unique dataset rows across {len(cat_names)} categories...")

    for i in range(target_count):
        cat = cat_names[i % len(cat_names)]
        vendors = CATEGORIES[cat]
        vendor_name, items = random.choice(vendors)
        
        # Pick 1 to 3 items
        num_items = random.randint(1, 3)
        chosen_items = random.sample(items, min(num_items, len(items)))
        item_str = " ".join(chosen_items)
        
        # Add random realistic numbers/codes to create high dataset entropy
        code = random.randint(100, 99999)
        mod_pattern = random.choice(NUMERIC_MODIFIERS)
        mod_str = mod_pattern.format(code)
        
        full_text = f"{vendor_name} {item_str} {mod_str}"
        rows.append((full_text, cat))
    
    random.seed(1337)
    random.shuffle(rows)
    
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        f.write("text,category\n")
        for text, category in rows:
            clean_text = text.replace('"', '""')
            f.write(f'"{clean_text}",{category}\n')
            
    print(f"Generated dataset with {len(rows)} lines at: {OUTPUT_PATH}")

if __name__ == "__main__":
    generate_10000_entries()
