import os

html_path = 'd:\\code\\smltrack\\landing\\index.html'

with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace fonts
content = content.replace('family=IBM+Plex+Sans+Thai', 'family=Prompt')
content = content.replace("fontFamily: { thai: ['IBM Plex Sans Thai'", "fontFamily: { thai: ['Prompt'")
content = content.replace("font-family: 'IBM Plex Sans Thai'", "font-family: 'Prompt'")

# Add Phosphor icons
if '@phosphor-icons/web' not in content:
    content = content.replace('</head>', '  <script src="https://unpkg.com/@phosphor-icons/web"></script>\n</head>')

# Replace Navbar emoji
content = content.replace('<div class="w-9 h-9 gradient-bg rounded-xl flex items-center justify-center text-lg shadow-lg glow-sm transition-transform group-hover:scale-105">\n          💬\n        </div>', '<div class="w-9 h-9 gradient-bg rounded-xl flex items-center justify-center text-lg shadow-lg glow-sm transition-transform group-hover:scale-105">\n          <i class="ph-fill ph-chat-teardrop-dots text-white"></i>\n        </div>')

# Replace Hero Image
old_hero_img = """<img src="/og-image.jpg" alt="OpenClaw Mini CRM — รวมทุกแชทในจอเดียว AI ช่วยตอบ ช่วยขาย ช่วยจำลูกค้า"
        class="w-full max-w-md md:max-w-lg rounded-3xl shadow-2xl glow border border-white/5"
        style="box-shadow: 0 20px 60px rgba(99,102,241,0.15), 0 0 120px rgba(6,182,212,0.08);"
        loading="lazy" />"""

new_hero_img = """<div class="relative w-full max-w-[280px] sm:max-w-md md:max-w-lg mx-auto">
        <div class="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-3xl blur opacity-30 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
        <img src="images/thai-sme-hero.png" alt="OpenClaw Mini CRM สำหรับ SME"
          class="relative w-full rounded-3xl shadow-2xl border border-white/10"
          loading="lazy" />
      </div>"""

content = content.replace(old_hero_img, new_hero_img)

# Replacements for How it works
content = content.replace('📱\n        </div>\n        <h4 class="font-bold mb-2">1. เชื่อมช่องทาง</h4>', '<i class="ph ph-device-mobile"></i>\n        </div>\n        <h4 class="font-bold mb-2">1. เชื่อมช่องทาง</h4>')
content = content.replace('🤖\n        </div>\n        <h4 class="font-bold mb-2">2. AI เริ่มทำงาน</h4>', '<i class="ph ph-robot"></i>\n        </div>\n        <h4 class="font-bold mb-2">2. AI เริ่มทำงาน</h4>')
content = content.replace('📊\n        </div>\n        <h4 class="font-bold mb-2">3. ดู Dashboard</h4>', '<i class="ph ph-chart-line-up"></i>\n        </div>\n        <h4 class="font-bold mb-2">3. ดู Dashboard</h4>')

# Replacements for Feature Grid (using specific string chunks)
replacements = {
    '>🗨️</div>': '><i class="ph ph-chats text-indigo-400"></i></div>',
    '>🤖</div>': '><i class="ph ph-robot text-cyan-400"></i></div>',
    '>💡</div>': '><i class="ph ph-lightbulb text-purple-400"></i></div>',
    '>🦐</div>': '><i class="ph ph-magic-wand text-amber-400"></i></div>',
    '>🧠</div>': '><i class="ph ph-brain text-emerald-400"></i></div>',
    '>📉</div>': '><i class="ph ph-trend-down text-red-400"></i></div>',
    '>📚</div>': '><i class="ph ph-books text-blue-400"></i></div>',
    '>📈</div>': '><i class="ph ph-trend-up text-teal-400"></i></div>',
    '>🔔</div>': '><i class="ph ph-bell text-rose-400"></i></div>',
    '>🔀</div>': '><i class="ph ph-arrows-merge text-violet-400"></i></div>',
    '>📱</div>': '><i class="ph ph-devices text-sky-400"></i></div>',
    '>💸</div>': '><i class="ph ph-money text-amber-400"></i></div>',
    '>📑</div>': '><i class="ph ph-file-text text-lime-400"></i></div>',
    '>📊</div>': '><i class="ph ph-chart-bar text-indigo-400"></i></div>',
    '>📅</div>': '><i class="ph ph-calendar text-orange-400"></i></div>',
    '>💰</div>': '><i class="ph ph-coin text-yellow-400"></i></div>',
    '>🏪</div>': '><i class="ph ph-storefront text-pink-400"></i></div>',
    '>📢</div>': '><i class="ph ph-megaphone text-pink-400"></i></div>',
    '>🏆</div>': '><i class="ph ph-trophy text-yellow-400"></i></div>',
    '>🤝</div>': '><i class="ph ph-handshake text-emerald-400"></i></div>',
}

for k, v in replacements.items():
    content = content.replace(k, v)

# Roles emojis
role_replacements = {
    '<span class="text-xl">🔍</span>': '<span class="text-xl text-amber-400"><i class="ph ph-magnifying-glass"></i></span>',
    '<span class="text-xl">💰</span>': '<span class="text-xl text-amber-400"><i class="ph ph-coins"></i></span>',
    '<span class="text-xl">👨‍🏫</span>': '<span class="text-xl text-amber-400"><i class="ph ph-chalkboard-teacher"></i></span>',
    '<span class="text-xl">📋</span>': '<span class="text-xl text-amber-400"><i class="ph ph-clipboard-text"></i></span>',
    '<span class="text-xl">❤️</span>': '<span class="text-xl text-red-400"><i class="ph ph-heartbeat"></i></span>',
    '<span class="text-xl">💳</span>': '<span class="text-xl text-cyan-400"><i class="ph ph-credit-card"></i></span>',
    '<span class="text-xl">📦</span>': '<span class="text-xl text-cyan-400"><i class="ph ph-package"></i></span>',
    '<span class="text-xl">🔄</span>': '<span class="text-xl text-cyan-400"><i class="ph ph-arrows-clockwise"></i></span>',
    '<span class="text-xl">🎯</span>': '<span class="text-xl text-cyan-400"><i class="ph ph-target"></i></span>',
    '<span class="text-xl">📊</span>': '<span class="text-xl text-cyan-400"><i class="ph ph-chart-pie-slice"></i></span>',
    '<span class="text-xl">🏆</span>': '<span class="text-xl text-cyan-400"><i class="ph ph-trophy"></i></span>',
    '<span class="text-xl">📅</span>': '<span class="text-xl text-cyan-400"><i class="ph ph-calendar-plus"></i></span>',
    '<span class="text-xl">📈</span>': '<span class="text-xl text-cyan-400"><i class="ph ph-chart-line-up"></i></span>',
}
for k, v in role_replacements.items():
    content = content.replace(k, v)
    
# Bottom Benefits Emoji
bot_replacements = {
    '>⏱️</div>': '><i class="ph ph-clock text-emerald-400"></i></div>',
    '>🧠</div>': '><i class="ph ph-brain text-blue-400"></i></div>',
    '>🔔</div>': '><i class="ph ph-bell-ringing text-red-400"></i></div>',
    '>💰</div>': '><i class="ph ph-currency-circle-dollar text-purple-400"></i></div>',
    '>👩‍💼</div>': '><i class="ph ph-user-focus text-cyan-400"></i></div>',
    '>📱</div>': '><i class="ph ph-device-mobile-camera text-indigo-400"></i></div>',
    '>🔀</div>': '><i class="ph ph-arrows-merge text-pink-400"></i></div>',
    '>🏠</div>': '><i class="ph ph-house-line text-amber-400"></i></div>',
}
for k, v in bot_replacements.items():
    content = content.replace(k, v)

# Add sections interleaving background
content = content.replace('class="relative z-10 max-w-6xl mx-auto px-4 md:px-6 pb-16 md:pb-24"', 'class="relative z-10 max-w-6xl mx-auto px-4 md:px-6 py-16 md:py-24"')
content = content.replace('<!-- ── น้องกุ้ง Multi AI Agent — 13 บทบาท ── -->\\n  <section class="relative z-10', '<!-- ── น้องกุ้ง Multi AI Agent — 13 บทบาท ── -->\\n  <section class="relative z-10 bg-white/[0.01] border-y border-white/[0.04] w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]')
content = content.replace('<div class="text-center mb-10 md:mb-14">', '<div class="text-center mb-10 md:mb-14 max-w-6xl mx-auto px-4 md:px-6">')

# Add AI Concept image to the "น้องกุ้ง Multi AI Agent" section
ai_concept = """
    <!-- New AI Concept Illustration -->
    <div class="anim-fade-up-d4 mt-12 md:mt-16 mb-12 flex justify-center max-w-6xl mx-auto px-4 md:px-6">
      <div class="relative w-full max-w-2xl">
        <div class="absolute -inset-1 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-3xl blur opacity-20"></div>
        <img src="images/ai-chat-concept.png" alt="AI Chat Concept" class="relative w-full rounded-3xl border border-white/5 shadow-2xl" loading="lazy" />
      </div>
    </div>
"""
content = content.replace('<!-- 13 Roles Grid -->', ai_concept + '\\n    <!-- 13 Roles Grid -->')


with open(html_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("HTML update script complete")
