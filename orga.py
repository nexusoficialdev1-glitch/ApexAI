import tkinter as tk
from tkinter import messagebox

def click_boton(valor):
    actual = entrada.get()
    entrada.delete(0, tk.END)
    entrada.insert(0, actual + str(valor))

def borrar():
    entrada.delete(0, tk.END)

def calcular():
    try:
        resultado = eval(entrada.get()) # Evalúa la operación matemática del texto
        entrada.delete(0, tk.END)
        entrada.insert(0, str(resultado))
    except ZeroDivisionError:
        messagebox.showerror("Error", "No puedes dividir por cero ❌")
        borrar()
    except Exception:
        messagebox.showerror("Error", "Operación inválida ❌")
        borrar()

# Configuración de la Ventana Principal
ventana = tk.Tk()
ventana.title("Calculadora ApexAI")
ventana.geometry("300x400")
ventana.configure(bg="#2c3e50")

# Pantalla de texto
entrada = tk.Entry(ventana, font=("Arial", 24), borderwidth=5, relief="flat", justify="right")
entrada.grid(row=0, column=0, columnspan=4, padx=10, pady=20, sticky="nsew")

# Definición de botones
botones = [
    '7', '8', '9', '/',
    '4', '5', '6', '*',
    '1', '2', '3', '-',
    'C', '0', '=', '+'
]

fila = 1
columna = 0

for boton in botones:
    # Color diferente para los operadores
    color = "#ecf0f1" if boton.isdigit() else "#3498db"
    if boton == '=': color = "#e74c3c"
    if boton == 'C': color = "#95a5a6"

    # Crear el botón
    comando = lambda x=boton: click_boton(x) if x != '=' and x != 'C' else (calcular() if x == '=' else borrar())
    
    tk.Button(ventana, text=boton, width=5, height=2, font=("Arial", 14, "bold"),
              bg=color, fg="black" if color == "#ecf0f1" else "white",
              command=comando).grid(row=fila, column=columna, padx=5, pady=5, sticky="nsew")

    columna += 1
    if columna > 3:
        columna = 0
        fila += 1

# Hacer que los botones se expandan
for i in range(4):
    ventana.grid_columnconfigure(i, weight=1)
for i in range(5):
    ventana.grid_rowconfigure(i, weight=1)

ventana.mainloop()