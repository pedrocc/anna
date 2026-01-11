# Start Application

Inicia a aplicação completa (banco de dados + API + Web).

Execute o seguinte comando:

```bash
bun start
```

Este comando irá:
1. Verificar portas disponíveis
2. Iniciar containers Docker (PostgreSQL + Redis)
3. Aguardar o banco estar pronto
4. Aplicar migrations automaticamente
5. Iniciar API e Web

Após executar, informe ao usuário as URLs disponíveis.
