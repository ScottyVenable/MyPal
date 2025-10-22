import argparse
import os
import re
import unicodedata
from textwrap import dedent

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))

TYPE_MAP = {
    "BUG": ("Bug Report", ["bug"]),
    "FEAT": ("Feature Request", ["feature"]),
    "TECH": ("Technical Debt", ["tech-debt"]),
    "DEPS": ("Documentation", ["documentation"]),
    "PERF": ("Enhancement", ["enhancement"]),
    "SEC": ("Security", ["security"]),
    "TEST": ("Testing", ["testing"]),
    "DEPLOY": ("Infrastructure", ["infrastructure"]),
    "INFRA": ("Infrastructure", ["infrastructure"]),
}

DEFAULT_ENVIRONMENT = {
    "OS": "Windows 10/11",
    "App Version": "v0.2.0-alpha (current)",
    "Node.js Version": "18.x",
    "React Native Version": "N/A",
}

COMPONENT_LINES = [
    "- [ ] Mobile App (`/mobile`)",
    "- [ ] Backend Server (`/app/backend`)",
    "- [ ] Frontend (`/app/frontend`)",
    "- [ ] AI/LLM Integration",
    "- [ ] Database/Storage",
    "- [ ] Documentation",
    "- [ ] Testing",
    "- [ ] Security",
    "- [ ] Other: ___________",
]

SKIP_SECTIONS = {"legend", "status labels", "estimates", "recently completed", "notes"}


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"dY['\"`~.-]*", "", text)
    text = text.replace("�", "")
    return text.strip()


def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def parse_todo(todo_path: str):
    if not os.path.exists(todo_path):
        raise FileNotFoundError(f"Could not locate TODO file at {todo_path}")

    items = []
    section = ""
    subsection = ""
    current = None

    with open(todo_path, encoding="utf-8") as fh:
        for raw_line in fh:
            line = raw_line.rstrip("\n")
            stripped = line.strip()

            if stripped.startswith("## "):
                section = normalize(stripped[3:])
                subsection = ""
                continue

            if stripped.startswith("### "):
                subsection = normalize(stripped[4:])
                continue

            lower_section = section.lower()
            if any(keyword in lower_section for keyword in SKIP_SECTIONS):
                current = None
                continue

            is_top_level_bullet = line.startswith("-") and stripped.startswith("-") and not stripped.startswith("- [x]")

            if is_top_level_bullet:
                if current:
                    items.append(current)

                clean_line = normalize(stripped)
                line_body = re.sub(r"^-+\s*(\[[ xX]\])?\s*", "", clean_line)
                inline_description = ""
                bold_match = re.search(r"\*\*(.+?)\*\*", line_body)
                if bold_match:
                    inline_description = line_body[bold_match.end():].lstrip(": ").strip()

                current = {
                    "section": section,
                    "subsection": subsection,
                    "raw": line_body,
                    "details": [],
                    "inline_description": inline_description,
                }
                continue

            if current is not None:
                if stripped == "":
                    current["details"].append("")
                else:
                    current["details"].append(normalize(stripped))

    if current:
        items.append(current)

    parsed = []
    for item in items:
        raw = item["raw"]
        tag = None
        title = raw

        match_tagged = re.search(r"\*\*\[([^\]]+)\]\s*(.+?)\*\*", raw)
        if match_tagged:
            tag = match_tagged.group(1)
            title = match_tagged.group(2)
        else:
            match_plain_tag = re.search(r"\[([A-Za-z]+-\d+)\]\s*(.+)", raw)
            if match_plain_tag:
                tag = match_plain_tag.group(1)
                title = match_plain_tag.group(2)
            else:
                match_bold = re.search(r"\*\*(.+?)\*\*", raw)
                if match_bold:
                    title = match_bold.group(1)

        tag = tag.strip() if tag else None
        title = title.strip()

        parsed.append(
            {
                "tag": tag,
                "title": title,
                "section": item["section"],
                "subsection": item["subsection"],
                "details": item["details"],
                "raw": raw,
                "inline_description": item.get("inline_description", ""),
            }
        )

    return parsed


def classify(item):
    tag = item["tag"]
    type_key = tag.split("-")[0].upper() if tag else None
    issue_type, labels = TYPE_MAP.get(type_key, ("Feature Request", ["feature"]))

    section_lower = (item["section"] or "").lower()
    subsection_lower = (item["subsection"] or "").lower()

    if not tag:
        if "bug" in subsection_lower:
            issue_type, labels = "Bug Report", ["bug"]
        elif "critical ui" in subsection_lower:
            issue_type, labels = "Feature Request", ["feature", "frontend", "ui"]
        elif "ui/ux" in subsection_lower or "ui ux" in subsection_lower or "ui enhancement" in subsection_lower:
            issue_type, labels = "Feature Request", ["feature", "frontend", "ui"]
        elif "help" in subsection_lower:
            issue_type, labels = "Feature Request", ["feature", "documentation", "frontend"]
        elif "feature" in subsection_lower:
            issue_type, labels = "Feature Request", ["feature"]
        elif "future consideration" in subsection_lower:
            issue_type, labels = "Feature Request", ["feature", "future"]

    priority = "Medium"
    if "priority: high" in section_lower:
        priority = "High"
    elif "priority: medium" in section_lower:
        priority = "Medium"
    elif "priority: low" in section_lower:
        priority = "Low"

    if "critical" in subsection_lower and priority == "Medium":
        priority = "High"

    return issue_type, labels, priority


def extract_fields(item):
    description_lines = []
    acceptance = []
    dependencies = None
    priority_override = None
    status_completed = False

    inline_description = item.get("inline_description")
    if inline_description:
        description_lines.append(inline_description)

    in_acceptance = False
    for line in item["details"]:
        clean = line.strip()
        plain = re.sub(r"^[-*]\s*", "", clean)
        lower = plain.lower()

        if lower.startswith("**description:**"):
            description_lines.append(plain.split("**Description:**", 1)[1].strip())
            continue
        if lower.startswith("**priority:**"):
            priority_override = plain.split("**Priority:**", 1)[1].strip()
            continue
        if lower.startswith("**dependencies:**"):
            dependencies = plain.split("**Dependencies:**", 1)[1].strip()
            continue
        if lower.startswith("**note:**"):
            description_lines.append(plain.split("**Note:**", 1)[1].strip())
            continue
        if lower.startswith("**status:**"):
            status_value = plain.split("**Status:**", 1)[1].strip()
            if status_value.lower() in {"completed", "done"}:
                status_completed = True
            description_lines.append(plain)
            continue
        if lower.startswith("**estimate:**"):
            description_lines.append(plain)
            continue
        if "acceptance criteria" in lower:
            in_acceptance = True
            continue

        if in_acceptance:
            if clean == "":
                in_acceptance = False
                continue
            bullet = re.sub(r"^[-\[\] ]+", "", clean).strip()
            if bullet:
                acceptance.append(bullet)
            continue

        if clean:
            description_lines.append(plain if plain else clean)

    description = "\n".join(description_lines).strip()

    return description, acceptance, dependencies, priority_override, status_completed


def build_issue_content(data, issue_type, labels, priority, description, acceptance, dependencies):
    acceptance_block = "\n".join(f"- [ ] {entry}" for entry in acceptance) if acceptance else "- [ ] Define acceptance criteria."
    label_text = ", ".join(labels) if labels else "(none)"
    description_text = description.strip() if description else data["title"]
    is_bug = "bug" in (labels or [])

    if is_bug:
        current_behavior = description_text or "See description above."
        expected_behavior = "Feature operates without the described defect."
        reproduction_steps = "1. Follow the steps outlined above to reproduce the issue."
    else:
        current_behavior = "Feature not implemented or incomplete; see description."
        expected_behavior = data["title"]
        reproduction_steps = "1. Not applicable - this is a planned task from the TODO list."

    gh_lines = [
        'gh issue create \\',
        f'  --title "{data["title"]}" \\',
        f'  --body-file "issues/{data["filename"]}" \\',
    ]
    for label in labels:
        gh_lines.append(f'  --label "{label}" \\')
    gh_lines.append('  --assignee "ScottyVenable"')
    gh_command = "\n".join(gh_lines)

    content = dedent(f"""# GitHub Issue Creation Request Template

## File Naming Convention
**Saved as:** `{data["filename"]}`

## Issue Information
**Title:** {data["title"]}
**Type:** {issue_type}
**Priority:** {priority}
**Labels:** {label_text}

## Description
{description_text}

## Context
**Related Files/Components:**
{chr(10).join(COMPONENT_LINES)}

**Current Behavior:** (for bugs)
{current_behavior}

**Expected Behavior:** (for bugs/enhancements)
{expected_behavior}

## Reproduction Steps (for bugs)
{reproduction_steps}

## Acceptance Criteria (for features/enhancements)
{acceptance_block}

## Technical Details
**Environment:**
- OS: {DEFAULT_ENVIRONMENT["OS"]}
- App Version: {DEFAULT_ENVIRONMENT["App Version"]}
- Node.js Version: {DEFAULT_ENVIRONMENT["Node.js Version"]}
- React Native Version: {DEFAULT_ENVIRONMENT["React Native Version"]}

**Error Messages/Logs:**
```
N/A
```

**Code References:**
- Files: To be determined
- Functions/Components: To be determined
- Line Numbers: Identify during implementation

## Implementation Notes
**Suggested Approach:**
Use the TODO entry details above to plan implementation. Translate described work into actionable development steps.

**Potential Challenges:**
To be determined during design.

**Dependencies:**
{dependencies or 'None noted.'}

## GitHub CLI Command
```bash
{gh_command}
```

## Additional Information
**References:**
- Related Issues: Add links once created
- Documentation: Link relevant specs or design docs
- External Resources: N/A

**Screenshots/Mockups:**
Attach or capture once available.
""")

    return "\n".join(line.rstrip() for line in content.strip().splitlines()) + "\n"


def main():
    parser = argparse.ArgumentParser(description="Generate issue files from TODO markdown")
    parser.add_argument("--todo", default="TODO v0.2.md", help="Path to TODO markdown file")
    parser.add_argument("--output", default="issues", help="Directory to write issue files")
    parser.add_argument("--skip-existing", action="store_true", help="Skip files that already exist")
    args = parser.parse_args()

    todo_path = args.todo
    if not os.path.isabs(todo_path):
        todo_path = os.path.join(PROJECT_ROOT, todo_path)

    output_dir = args.output
    if not os.path.isabs(output_dir):
        output_dir = os.path.join(PROJECT_ROOT, output_dir)

    os.makedirs(output_dir, exist_ok=True)

    items = parse_todo(todo_path)

    for item in items:
        issue_type, labels, priority = classify(item)
        description, acceptance, dependencies, override_priority, status_completed = extract_fields(item)

        if status_completed:
            continue

        if override_priority:
            priority = override_priority

        tag_part = item["tag"].lower().replace("/", "-") if item["tag"] else ""
        base_slug = slugify(item["title"]) or "todo-item"
        slug_parts = [base_slug]
        if tag_part:
            slug_parts.insert(0, tag_part)

        label_prefix = labels[0] if labels else "task"
        label_prefix = label_prefix.replace("/", "-")

        filename = f"[{label_prefix}]--{'-'.join(slug_parts)}.md"
        target_dir = output_dir
        if "bug" in labels:
            target_dir = os.path.join(output_dir, "bugs")
            os.makedirs(target_dir, exist_ok=True)

        filepath = os.path.join(target_dir, filename)

        if args.skip_existing and os.path.exists(filepath):
            continue
        if os.path.exists(filepath):
            print(f"Skipping existing file {filepath}")
            continue

        data = {"title": item["title"], "filename": filename}
        content = build_issue_content(data, issue_type, labels, priority, description, acceptance, dependencies)

        with open(filepath, "w", encoding="utf-8") as fh:
            fh.write(content)
        print(f"Created {filepath}")


if __name__ == "__main__":
    main()
