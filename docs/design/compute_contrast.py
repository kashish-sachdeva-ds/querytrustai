import os
import re

def srgb_to_lin(c):
    c_norm = c / 255.0
    if c_norm <= 0.04045:
        return c_norm / 12.92
    return ((c_norm + 0.055) / 1.055) ** 2.4

def relative_luminance(rgb):
    r, g, b = rgb
    return 0.2126 * srgb_to_lin(r) + 0.7152 * srgb_to_lin(g) + 0.0722 * srgb_to_lin(b)

def hex_to_rgb(hex_str):
    h = hex_str.lstrip('#')
    if len(h) == 3:
        h = ''.join(c + c for c in h)
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def composite(fg_rgba, bg_rgb):
    # fg_rgba is (r, g, b, a)
    r_f, g_f, b_f, a = fg_rgba
    r_b, g_b, b_b = bg_rgb
    r_c = r_f * a + r_b * (1.0 - a)
    g_c = g_f * a + g_b * (1.0 - a)
    b_c = b_f * a + b_b * (1.0 - a)
    return (r_c, g_c, b_c)

def contrast_ratio(rgb1, rgb2):
    l1 = relative_luminance(rgb1)
    l2 = relative_luminance(rgb2)
    lighter = max(l1, l2)
    darker = min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)

# 1. Colors
dark_page = hex_to_rgb('#0E0F11')
dark_surface = hex_to_rgb('#141518')
dark_raised = hex_to_rgb('#1A1B1F')

light_page = hex_to_rgb('#F7F6F3')
light_surface = hex_to_rgb('#FFFFFF')
light_raised = hex_to_rgb('#FAFAFA')

# Borders
dark_border_subtle_rgba = (255, 255, 255, 0.08)
dark_border_subtle = composite(dark_border_subtle_rgba, dark_surface)
dark_border_strong = hex_to_rgb('#60646C') # 3.07:1 on dark surface

light_border_subtle = hex_to_rgb('#E6E4DF')
light_border_strong = hex_to_rgb('#8A8D96') # ~3.1:1 on light surface

# Typography
dark_text_primary = hex_to_rgb('#ECECEE')
dark_text_secondary = hex_to_rgb('#9A9CA3')

light_text_primary = hex_to_rgb('#16171A')
light_text_secondary = hex_to_rgb('#686B74')

# Accent
accent_primary = hex_to_rgb('#5B5EE6')
white = (255, 255, 255)
accent_link_dark = hex_to_rgb('#9B9EF5')
accent_link_light = hex_to_rgb('#4A4DD6')

# Status Dots (UI components, min 3:1)
status_dot_success_dark = hex_to_rgb('#4EBE59')
status_dot_success_light = hex_to_rgb('#2E7D32')

status_dot_warning_dark = hex_to_rgb('#F5A742')
status_dot_warning_light = hex_to_rgb('#D97706')

status_dot_error_dark = hex_to_rgb('#F87171')
status_dot_error_light = hex_to_rgb('#DC2626')

# Status Text (Body text, min 4.5:1)
status_text_success_dark = hex_to_rgb('#68D377')
status_text_success_light = hex_to_rgb('#166534')

status_text_warning_dark = hex_to_rgb('#FBBF24')
status_text_warning_light = hex_to_rgb('#92400E')

status_text_error_dark = hex_to_rgb('#FCA5A5')
status_text_error_light = hex_to_rgb('#991B1B')

pairs = [
    # Dark Mode Pairings
    ('Dark Page BG vs Surface', dark_page, dark_surface, 'Decorative'),
    ('Dark Border Subtle (8% white) on Surface', dark_border_subtle, dark_surface, 'Decorative hairline (>=1.0:1)'),
    ('Dark Border Strong (#60646C) on Surface', dark_border_strong, dark_surface, 'UI Control Border (>=3:1)'),
    ('Dark Text Primary (#ECECEE) on Surface', dark_text_primary, dark_surface, 'Body Text (>=4.5:1)'),
    ('Dark Text Primary (#ECECEE) on Page BG', dark_text_primary, dark_page, 'Body Text (>=4.5:1)'),
    ('Dark Text Secondary (#9A9CA3) on Surface', dark_text_secondary, dark_surface, 'Secondary Text (>=4.5:1)'),
    ('Dark Text Secondary (#9A9CA3) on Page BG', dark_text_secondary, dark_page, 'Secondary Text (>=4.5:1)'),
    ('Accent Link Dark (#9B9EF5) on Surface', accent_link_dark, dark_surface, 'Interactive Link (>=4.5:1)'),
    ('Accent Link Dark (#9B9EF5) on Page BG', accent_link_dark, dark_page, 'Interactive Link (>=4.5:1)'),
    ('Primary Button: White on #5B5EE6', white, accent_primary, 'Button Label (>=4.5:1)'),
    ('Status Dot Success Dark (#4EBE59) on Surface', status_dot_success_dark, dark_surface, 'UI Dot Indicator (>=3:1)'),
    ('Status Dot Warning Dark (#F5A742) on Surface', status_dot_warning_dark, dark_surface, 'UI Dot Indicator (>=3:1)'),
    ('Status Dot Error Dark (#F87171) on Surface', status_dot_error_dark, dark_surface, 'UI Dot Indicator (>=3:1)'),
    ('Status Text Success Dark (#68D377) on Surface', status_text_success_dark, dark_surface, 'Text Label (>=4.5:1)'),
    ('Status Text Warning Dark (#FBBF24) on Surface', status_text_warning_dark, dark_surface, 'Text Label (>=4.5:1)'),
    ('Status Text Error Dark (#FCA5A5) on Surface', status_text_error_dark, dark_surface, 'Text Label (>=4.5:1)'),

    # Light Mode Pairings
    ('Light Page BG vs Surface', light_page, light_surface, 'Decorative'),
    ('Light Border Subtle (#E6E4DF) on Surface', light_border_subtle, light_surface, 'Decorative hairline (>=1.0:1)'),
    ('Light Border Strong (#8A8D96) on Surface', light_border_strong, light_surface, 'UI Control Border (>=3:1)'),
    ('Light Text Primary (#16171A) on Surface', light_text_primary, light_surface, 'Body Text (>=4.5:1)'),
    ('Light Text Primary (#16171A) on Page BG', light_text_primary, light_page, 'Body Text (>=4.5:1)'),
    ('Light Text Secondary (#686B74) on Surface', light_text_secondary, light_surface, 'Secondary Text (>=4.5:1)'),
    ('Light Text Secondary (#686B74) on Page BG', light_text_secondary, light_page, 'Secondary Text (>=4.5:1)'),
    ('Accent Link Light (#4A4DD6) on Surface', accent_link_light, light_surface, 'Interactive Link (>=4.5:1)'),
    ('Accent Link Light (#4A4DD6) on Page BG', accent_link_light, light_page, 'Interactive Link (>=4.5:1)'),
    ('Primary Button (Light): White on #5B5EE6', white, accent_primary, 'Button Label (>=4.5:1)'),
    ('Status Dot Success Light (#2E7D32) on Surface', status_dot_success_light, light_surface, 'UI Dot Indicator (>=3:1)'),
    ('Status Dot Warning Light (#D97706) on Surface', status_dot_warning_light, light_surface, 'UI Dot Indicator (>=3:1)'),
    ('Status Dot Error Light (#DC2626) on Surface', status_dot_error_light, light_surface, 'UI Dot Indicator (>=3:1)'),
    ('Status Text Success Light (#166534) on Surface', status_text_success_light, light_surface, 'Text Label (>=4.5:1)'),
    ('Status Text Warning Light (#92400E) on Surface', status_text_warning_light, light_surface, 'Text Label (>=4.5:1)'),
    ('Status Text Error Light (#991B1B) on Surface', status_text_error_light, light_surface, 'Text Label (>=4.5:1)'),

    # Audit Corrections specifically asked by user
    ('USER CHECK: rgba(255,255,255,0.08) on #141518', dark_border_subtle, dark_surface, 'Audit check'),
    ('USER CHECK: #C77700 on white', hex_to_rgb('#C77700'), light_surface, 'Audit check'),
    ('USER CHECK: #A1A1AA on white', hex_to_rgb('#A1A1AA'), light_surface, 'Audit check'),
    ('AUDIT BUG: #FAFAFA on #FFFFFF (White on White buttons)', hex_to_rgb('#FAFAFA'), white, 'Audit bug check')
]

out = ["# WCAG 2.1 Contrast Ratio Verification Report\n\n",
       "Generated deterministically by `docs/design/compute_contrast.py`.\n\n",
       "| Item / Pairing | Category / Requirement | Computed Ratio | Result |\n",
       "|---|---|---|---|\n"]

for label, c1, c2, cat in pairs:
    cr = contrast_ratio(c1, c2)
    passed = "✅ Pass"
    if ">=4.5:1" in cat and cr < 4.5:
        passed = "❌ Fail"
    elif ">=3:1" in cat and cr < 3.0:
        passed = "❌ Fail"
    elif "White on White" in cat:
        passed = "❌ Critical Fail (1.05:1)"
    out.append(f"| {label} | {cat} | **{cr:.2f}:1** | {passed} |\n")

report_text = "".join(out)
print(report_text)
with open('d:/Important/00-Projects/QueryTrustAI/docs/design/contrast_report.md', 'w', encoding='utf-8') as f:
    f.write(report_text)
