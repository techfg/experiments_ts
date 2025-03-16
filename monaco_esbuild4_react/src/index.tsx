import "./style.css"

import { createRoot } from "react-dom/client"
import { Editor } from './components/Editor';
import "./monaco_loader.ts"

const root = createRoot(document.getElementById('root')!)
root.render(<Editor />)
	