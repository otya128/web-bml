import fontforge
font = fontforge.open("./KosugiMaru-Regular.woff2")
font.familyname = "Kosugi Maru Bold"
font.fontname = "KosugiMaru-Bold"
font.fullname = "Kosugi Maru Bold"
for glyph in font.glyphs():
    width = glyph.width
    vwidth = glyph.vwidth
    if width == 512:
        glyph.transform([0.8, 0, 0, 1, 0, 0])
    glyph.changeWeight(50)
    glyph.width = width
    glyph.vwidth = vwidth

font.generate("KosugiMaru-Bold.woff2", flags = ("no-FFTM-table"))
