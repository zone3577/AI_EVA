from dotenv import load_dotenv

from config_gui import ConfigGUI

load_dotenv()

if __name__ == "__main__":
    try:
        gui = ConfigGUI()
        gui.run()
    except KeyboardInterrupt:
        print("Exiting on user interrupt...")
