# Kill Running Application

Force kills all running instances of scene-builder.

```bash
taskkill //F //IM "scene-builder.exe" 2>NUL || echo "Process not found or already closed"
```
