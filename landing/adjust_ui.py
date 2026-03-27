import os

html_path = 'd:\\code\\smltrack\\landing\\index.html'

with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Restore og-image.jpg as Hero Image
old_hero = '''<div class="relative w-full max-w-[280px] sm:max-w-md md:max-w-lg mx-auto">
        <div class="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-3xl blur opacity-30 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
        <img src="images/thai-sme-hero.png" alt="OpenClaw Mini CRM สำหรับ SME"
          class="relative w-full rounded-3xl shadow-2xl border border-white/10"
          loading="lazy" />
      </div>'''

new_hero = '''<img src="/og-image.jpg" alt="OpenClaw Mini CRM — รวมทุกแชทในจอเดียว AI ช่วยตอบ ช่วยขาย ช่วยจำลูกค้า"
        class="w-full max-w-md md:max-w-lg rounded-3xl shadow-2xl glow border border-white/5 mx-auto"
        style="box-shadow: 0 20px 60px rgba(99,102,241,0.15), 0 0 120px rgba(6,182,212,0.08);"
        loading="lazy" />'''

content = content.replace(old_hero, new_hero)

# 2. Put thai-sme-hero.png in the "สำหรับ SMEs ไทย" section (before the grid)
old_sme_section = '''<h3 class="reveal text-2xl md:text-3xl font-bold mb-3">ประโยชน์ที่ธุรกิจ SMEs จะได้รับ</h3>
      <p class="reveal text-sm md:text-base text-gray-400 max-w-2xl mx-auto leading-relaxed">
        ออกแบบมาเพื่อธุรกิจขนาดเล็ก-กลางในไทยโดยเฉพาะ<br>
        ใช้ LINE OA + Facebook + Instagram ที่คนไทยใช้กันทุกวัน
      </p>
    </div>'''

new_sme_section = '''<h3 class="reveal text-3xl md:text-4xl lg:text-5xl font-bold mb-4">ประโยชน์ที่ธุรกิจ SMEs จะได้รับ</h3>
      <p class="reveal text-sm md:text-base text-gray-400 max-w-2xl mx-auto leading-relaxed mb-8">
        ออกแบบมาเพื่อธุรกิจขนาดเล็ก-กลางในไทยโดยเฉพาะ<br>
        ใช้ LINE OA + Facebook + Instagram ที่คนไทยใช้กันทุกวัน
      </p>
      
      <div class="anim-fade-up-d4 flex justify-center max-w-6xl mx-auto px-4 md:px-6 mb-12">
        <div class="relative w-full max-w-2xl">
          <div class="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-3xl blur opacity-30"></div>
          <img src="images/thai-sme-hero.png" alt="SME Hero" class="relative w-full rounded-3xl border border-white/10 shadow-2xl" loading="lazy" />
        </div>
      </div>
    </div>'''

content = content.replace(old_sme_section, new_sme_section)

# 3. Increase text sizes and reduce paddings/margins globally

# Hero title
content = content.replace('text-3xl sm:text-4xl md:text-5xl lg:text-6xl', 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl')
# Hero subtitle
content = content.replace('text-sm sm:text-base md:text-lg', 'text-base sm:text-lg md:text-xl')

# Section titles
content = content.replace('text-2xl md:text-3xl', 'text-3xl md:text-4xl lg:text-5xl')

# General text descriptions from small to normal
content = content.replace('text-xs sm:text-sm', 'text-sm sm:text-base')
content = content.replace('text-sm md:text-base', 'text-base md:text-lg')

# Reduce sections Y padding
content = content.replace('pt-16 md:pt-24', 'pt-8 md:pt-12')
content = content.replace('pb-12 md:pb-20', 'pb-6 md:pb-10')
content = content.replace('pb-16 md:pb-24', 'pb-8 md:pb-12')
content = content.replace('py-16 md:py-24', 'py-8 md:py-12')
content = content.replace('p-6 md:p-8', 'p-4 md:p-6')
content = content.replace('p-5 md:p-6', 'p-4 md:p-5')
content = content.replace('mb-10 md:mb-14', 'mb-6 md:mb-8')
content = content.replace('mt-10 md:mt-14', 'mt-6 md:mt-8')
content = content.replace('mt-12 md:mt-16', 'mt-8 md:mt-10')

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(content)
