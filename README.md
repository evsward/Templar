# Templar
> Christianity and the Knights Templar.

> Do something with eosjs on EOS blockchain. 

## nodejs + redis-as-queue
- consume(statistics) response msg: http://127.0.0.1:88/consumeTrxRes
- matched check balance:

```
cleos --wallet-url http://127.0.0.1:6666 --url http://127.0.0.1:8000  get currency balance eosio.token eosiotesta1
```

- push test request: node testpush-local.js
- check queue status: node check-queue.js
- execute the main function: node src/pack_actions.js