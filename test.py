# Medicine Inventory Program

# Unit conversion table
UNITS = {
    "tablet": 1,
    "strip": 15,
    "box": 300
}

# Inventory stored internally as TABLETS
inventory = 0


# Show stock in all formats
def show_stock():
    global inventory

    tablets = inventory

    boxes = tablets // 300
    tablets = tablets % 300

    strips = tablets // 15
    tablets = tablets % 15

    print("\n====== CURRENT STOCK ======")
    print("Boxes   :", boxes)
    print("Strips  :", strips)
    print("Tablets :", tablets)
    print("Total Tablets :", inventory)
    print("===========================\n")


# Add stock
def add_stock():
    global inventory

    qty = int(input("Enter quantity to add: "))
    unit = input("Enter unit (box/strip/tablet): ").lower()

    if unit not in UNITS:
        print("Invalid unit")
        return

    inventory += qty * UNITS[unit]

    print(f"\n✅ Added {qty} {unit}(s)")
    show_stock()


# Sell stock
def sell_stock():
    global inventory

    qty = int(input("Enter quantity to sell: "))
    unit = input("Enter unit (box/strip/tablet): ").lower()

    if unit not in UNITS:
        print("Invalid unit")
        return

    tablets_needed = qty * UNITS[unit]

    if tablets_needed > inventory:
        print("\n❌ Not enough stock")
        return

    inventory -= tablets_needed

    print(f"\n✅ Sold {qty} {unit}(s)")
    show_stock()


# Main menu
while True:

    print("===== MEDICAL INVENTORY =====")
    print("1. Add Stock")
    print("2. Sell Stock")
    print("3. Show Stock")
    print("4. Exit")

    choice = input("Enter choice: ")

    if choice == "1":
        add_stock()

    elif choice == "2":
        sell_stock()

    elif choice == "3":
        show_stock()

    elif choice == "4":
        print("Program Closed")
        break

    else:
        print("Invalid choice")