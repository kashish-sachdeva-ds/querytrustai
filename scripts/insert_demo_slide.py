import pptx
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

def main():
    prs = pptx.Presentation('QueryTrust_AI_Executive_Evaluation_Deck.pptx')
    blank_layout = prs.slide_layouts[6]

    # Theme colors
    BG_COLOR = RGBColor(11, 15, 25)
    CARD_BG = RGBColor(19, 26, 43)
    CARD_BORDER = RGBColor(37, 51, 80)
    CYAN = RGBColor(6, 182, 212)
    EMERALD = RGBColor(16, 185, 129)
    AMBER = RGBColor(245, 158, 11)
    ROSE = RGBColor(239, 68, 68)
    WHITE = RGBColor(248, 250, 252)
    LIGHT_GRAY = RGBColor(203, 213, 225)

    slide = prs.slides.add_slide(blank_layout)

    # BG
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    bg.fill.solid()
    bg.fill.fore_color.rgb = BG_COLOR
    bg.line.fill.background()

    # Category
    cat_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.7), Inches(0.35))
    tf_cat = cat_box.text_frame
    p_cat = tf_cat.paragraphs[0]
    p_cat.text = "LIVE BENCHMARK EVALUATION"
    p_cat.font.size = Pt(10)
    p_cat.font.bold = True
    p_cat.font.color.rgb = CYAN

    # Title
    title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.7), Inches(11.7), Inches(0.65))
    tf_title = title_box.text_frame
    p_title = tf_title.paragraphs[0]
    p_title.text = "06 / LIVE DEMO: 4 VERIFICATION SCENARIOS"
    p_title.font.size = Pt(22)
    p_title.font.bold = True
    p_title.font.color.rgb = WHITE

    scenarios = [
        ("SCENARIO 1: HAPPY PATH & SMART AUTO-CHART",
         "ACTION: Click 1st Starter Card in UI (No typing needed!)",
         '"How many active devices are in each region?"',
         "• Proves: Auto LIMIT 200 clamp + 6 green AST badges + Recharts Bar Chart in <40ms.",
         EMERALD, Inches(0.8), Inches(1.5), Inches(5.6)),

        ("SCENARIO 2: THE AMBIGUITY TRAP",
         'ACTION: Click "Ask about high-risk devices" Card (No typing needed!)',
         '"Show all high-risk devices in New York."',
         "• Proves: Halts SQL generation. Surfaces 3 options. Click Option 1 (Warranty <= 30d). Zero guessing.",
         AMBER, Inches(6.8), Inches(1.5), Inches(5.7)),

        ("SCENARIO 3: HOSTILE SQL INJECTION & DROP",
         "ACTION: Paste Semicolon Stacking Payload into Input Box",
         "SELECT * FROM devices; DROP TABLE sites; --",
         "• Proves: Flags 2 AST errors (Drop + Multiple statements). Execute button locked. DB role rejects.",
         ROSE, Inches(0.8), Inches(4.35), Inches(5.6)),

        ("SCENARIO 4: OUT-OF-DOMAIN FIREWALL",
         "ACTION: Type Financial / Payroll Question into Input Box",
         '"What was our total company profit and executive payroll?"',
         "• Proves: Semantic Catalog rejects unsupported domain concepts. Zero SQL, zero DB queries.",
         CARD_BORDER, Inches(6.8), Inches(4.35), Inches(5.7))
    ]

    for title, act, query, proof, border_col, left, top, width in scenarios:
        c = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, Inches(2.6))
        c.fill.solid()
        c.fill.fore_color.rgb = CARD_BG
        c.line.color.rgb = border_col
        c.line.width = Pt(1.5)
        tf = c.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0.3)
        tf.margin_top = Inches(0.2)

        p0 = tf.paragraphs[0]
        p0.text = title
        p0.font.size = Pt(12)
        p0.font.bold = True
        p0.font.color.rgb = border_col if border_col != CARD_BORDER else WHITE

        p1 = tf.add_paragraph()
        p1.text = act
        p1.font.size = Pt(10)
        p1.font.bold = True
        p1.font.color.rgb = CYAN

        p2 = tf.add_paragraph()
        p2.text = query
        p2.font.size = Pt(12)
        p2.font.bold = True
        p2.font.color.rgb = WHITE

        p3 = tf.add_paragraph()
        p3.text = proof
        p3.font.size = Pt(10)
        p3.font.color.rgb = LIGHT_GRAY

    # Insert before the last slide (Thank You)
    sldIdLst = prs.slides._sldIdLst
    new_elem = sldIdLst[-1]
    sldIdLst.remove(new_elem)
    # Put right before the last slide
    sldIdLst.insert(len(sldIdLst) - 1, new_elem)

    try:
        prs.save('QueryTrust_AI_Executive_Evaluation_Deck.pptx')
        print("SUCCESS: Added Slide 06: Live Demo 4 Verification Scenarios into presentation!")
    except PermissionError:
        prs.save('QueryTrust_AI_Executive_Evaluation_Deck_Updated.pptx')
        print("SUCCESS: Saved as QueryTrust_AI_Executive_Evaluation_Deck_Updated.pptx (Original was open in PowerPoint)!")

if __name__ == '__main__':
    main()
