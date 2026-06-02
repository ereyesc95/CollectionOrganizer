"""Native folder picker (Windows Explorer) via tkinter."""

from __future__ import annotations


def pick_folder(initial_dir: str = "") -> str | None:
    try:
        import tkinter as tk
        from tkinter import filedialog
    except ImportError:
        return None

    root = tk.Tk()
    root.withdraw()
    try:
        root.attributes("-topmost", True)
    except tk.TclError:
        pass
    path = filedialog.askdirectory(
        parent=root,
        initialdir=initial_dir or None,
        title="Select covers folder",
    )
    root.destroy()
    return path if path else None


def pick_image_file(initial_dir: str = "") -> str | None:
    try:
        import tkinter as tk
        from tkinter import filedialog
    except ImportError:
        return None

    root = tk.Tk()
    root.withdraw()
    try:
        root.attributes("-topmost", True)
    except tk.TclError:
        pass
    path = filedialog.askopenfilename(
        parent=root,
        initialdir=initial_dir or None,
        title="Select autograph photo",
        filetypes=[
            ("Images", "*.jpg *.jpeg *.png *.webp *.gif *.bmp"),
            ("All files", "*.*"),
        ],
    )
    root.destroy()
    return path if path else None
