import asyncio
import json
from app.services.prompts import build_receipt_invoice_extraction_prompt
from google import genai
from google.genai import types
from app.core.config import get_settings

async def main():
    settings = get_settings()
    api_key = settings.gemini_api_key.get_secret_value()
    client = genai.Client(api_key=api_key)
    
    prompt = build_receipt_invoice_extraction_prompt()
    receipt_text = """
    Aashirvaad Atta 5kg       ₹289.00
    Amul Toned Milk 1L        ₹126.00
    India Gate Basmati Rice   ₹349.00
    Fortune Sunflower Oil     ₹139.00
    Surf Excel Matic 2kg      ₹159.00
    Surf Excel Matic 2kg      ₹299.00

    Subtotal       = ₹1,361.00
    Discount       = ₹61.00
    Taxable Amount = ₹1,300.00
    CGST (2.5%)    = ₹32.50
    SGST (2.5%)    = ₹32.50
    Total Tax      = ₹65.00
    TOTAL          = ₹1,365.00
    """
    
    config = types.GenerateContentConfig(response_mime_type="application/json")
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[prompt, receipt_text],
        config=config,
    )
    
    print("Gemini Output:")
    print(response.text)
    
    try:
        data = json.loads(response.text)
        print("\nParsed JSON:")
        print(json.dumps(data, indent=2))
    except Exception as e:
        print("Failed to parse JSON:", e)

if __name__ == "__main__":
    asyncio.run(main())
