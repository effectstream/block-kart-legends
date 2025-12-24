# block-kart-legends

<img width="1284" height="1023" alt="Screenshot 2025-12-22 at 5 08 05 PM" src="https://github.com/user-attachments/assets/202bb931-b077-4fc9-a9ac-8338fc0e9508" />

```sh
# Check for external dependencies
./../check.sh

# Install packages
deno install --allow-scripts && ./patch.sh

# Compile contracts
deno task build:evm
deno task build:midnight

# TODO this can be ran after the first launch of the node
# deno task -f @my-project-all pgtyped:update

# Launch Paima Engine Node
deno task dev
```

Open [http://localhost:10599](http://localhost:10599)
