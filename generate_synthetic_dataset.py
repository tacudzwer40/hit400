import os
import random
import qrcode
from PIL import Image, ImageDraw, ImageFont

print("Generating 50 Exact Pixel-Perfect Clones matching the 5 definitive Deed pages...")

out_dir = "public/dataset/synthetic_deeds"
os.makedirs(out_dir, exist_ok=True)

names = ["JOHNATHAN MOYO", "BLESSING DUBE", "SHINGIRAI NYONI", "RUTENDO CHIKEPE", "RUDO MATSIKA"]
ids = ["29-2034066G43", "63-1029384F22", "14-8765432X11", "08-6543219Z09"]
sizes_text = ["THREE HUNDRED AND THIRTY\n(330 Square Metres)", "FOUR HUNDRED\n(400 Square Metres)"]
sizes_short = ["330 Square Metres", "400 Square Metres"]
locations = ["Stand 89 ARLINGTON, AIRPORT AVENUE", "Stand 453, HARARE NORTH", "Stand 12, BULAWAYO CENTRAL"]
plans = ["89/2021", "453/2018", "12/2012"]
transfers = ["14/89/2021", "12/100/2019", "55/12/2023"]

try:
    font_large_serif = ImageFont.truetype("times.ttf", 36)
    font_medium_serif = ImageFont.truetype("times.ttf", 22)
    font_bold_serif = ImageFont.truetype("timesbd.ttf", 22)
except IOError:
    font_large_serif = ImageFont.load_default()
    font_medium_serif = ImageFont.load_default()
    font_bold_serif = ImageFont.load_default()

# Map the exact files in logical order based on the user's feedback
source_base = r"C:\Users\USER\.gemini\antigravity\brain\2e918b71-8272-452d-98e8-f763dc7293b0"
file_page1 = os.path.join(source_base, "media__1773923033685.png") # Deed of Transfer title
file_page2 = os.path.join(source_base, "media__1773923033888.png") # Stamp
file_page3 = os.path.join(source_base, "media__1773923033918.png") # Watson Muchengeti / TONDERAI
file_page4 = os.path.join(source_base, "media__1773923034137.png") # Extending / Signatures
file_page5 = os.path.join(source_base, "media__1773923033455.png") # Minister grant

for i in range(50):
    owner = random.choice(names)
    loc = random.choice(locations)
    owner_id = random.choice(ids)
    
    idx = random.randint(0, len(sizes_text)-1)
    size_t = sizes_text[idx]
    size_s = sizes_short[idx]
    
    plan = random.choice(plans)
    transfer = random.choice(transfers)
    
    deed_folder = os.path.join(out_dir, f"Deed_{i+1:03d}")
    os.makedirs(deed_folder, exist_ok=True)
    
    # PAGE 1: Deed of Transfer (media__1773923033685.png)
    img1 = Image.open(file_page1).convert('RGB')
    draw1 = ImageDraw.Draw(img1)
    draw1.rectangle([250, 560, 680, 620], fill="white") # Erase TONDERAI
    draw1.text((300, 570), owner, font=font_large_serif, fill='black')
    img1.save(os.path.join(deed_folder, "Page_1.jpg"), quality=85)
    
    # PAGE 2: Assistance Secretary Stamp (media__1773923033888.png)
    img2 = Image.open(file_page2).convert('RGB')
    img2.save(os.path.join(deed_folder, "Page_2.jpg"), quality=85)
    
    # PAGE 3: The Watson to Tonderai transfer text (NEW IMAGE! media__1773923033918.png)
    img3 = Image.open(file_page3).convert('RGB')
    draw3 = ImageDraw.Draw(img3)
    draw3.rectangle([200, 400, 650, 450], fill="white") # Erase TONDERAI MUSHORIWA
    draw3.text((250, 410), owner, font=font_large_serif, fill='black')
    
    draw3.rectangle([200, 770, 750, 810], fill="white") # Erase CALLED address
    draw3.text((210, 780), loc, font=font_medium_serif, fill='black')
    
    draw3.rectangle([250, 820, 550, 850], fill="white") # Erase MEASURING
    draw3.text((260, 825), size_s, font=font_medium_serif, fill='black')
    
    draw3.rectangle([180, 860, 650, 890], fill="white") # Erase HELD transfer
    draw3.text((190, 865), f"Under Deed of Transfer No. {transfer}", font=font_medium_serif, fill='black')
    img3.save(os.path.join(deed_folder, "Page_3.jpg"), quality=85)
    
    # PAGE 4: Extending / Signatures (media__1773923034137.png)
    img4 = Image.open(file_page4).convert('RGB')
    img4.save(os.path.join(deed_folder, "Page_4.jpg"), quality=85)
    
    # PAGE 5: Minister Grant (media__1773923033455.png)
    img5 = Image.open(file_page5).convert('RGB')
    draw5 = ImageDraw.Draw(img5)
    draw5.rectangle([220, 270, 750, 310], fill="white") # Erase Tonderai + ID
    draw5.text((230, 280), f"{owner} ID No. {owner_id}", font=font_medium_serif, fill='black')
    
    draw5.rectangle([100, 390, 750, 460], fill="white") # Erase measuring text block
    draw5.text((110, 400), size_t, font=font_medium_serif, fill='black')
    
    draw5.rectangle([170, 480, 650, 520], fill="white") # Erase called Stand
    draw5.text((180, 490), loc, font=font_medium_serif, fill='black')
    
    draw5.rectangle([450, 660, 650, 690], fill="white") # Erase General Plan number
    draw5.text((460, 665), plan, font=font_medium_serif, fill='black')
    img5.save(os.path.join(deed_folder, "Page_5.jpg"), quality=85)
    
    # PAGE 6: QR Web3 Verifier
    img6 = Image.new('RGB', (img1.width, img1.height), color='white')
    draw6 = ImageDraw.Draw(img6)
    draw6.text((150, 200), "PAGE 6: DEEDGUARD IMMUTABLE LEDGER VERIFICATION", font=font_medium_serif, fill='black')
    qr = qrcode.QRCode(box_size=8)
    qr.add_data(f"VERIFIED:{owner_id}:{owner}")
    qr_img = qr.make_image(fill_color="black", back_color="white").convert('RGB')
    img6.paste(qr_img, (300, 400))
    img6.save(os.path.join(deed_folder, "Page_6.jpg"), quality=85)

print("\n[SUCCESS] Custom Engine generated 300 perfect image mutations directly from original uploaded 5-page document layout!")
