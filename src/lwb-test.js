/**
 * pre-execution: python3 ./bios-boot-tutorial.py -k -w -b -s -c -t {-l}
 */

const Eos = require('../src')
const ecc = require('eosjs-ecc')
const raq = require("redis-as-queue");
const keyProvider = [
    "5K463ynhZoCDDa4RDcr63cUwWLTnKqmdcoTKTHBjqoKfv4u5V7p",
    "5JxWkyTDwktJVs9MNgNgmaLrRc26ESswR9gk926g47t6UCqvmop"
]
// console.log(ecc.seedPrivate('test-tps'))
const nameRule = "12345abcdefghijklmnopqrstuvwxyz"
const config = {
    trx_pool_size: 10,
    optBCST: {expireInSeconds: 120, broadcast: true},
    optLocal: {expireInSeconds: 60, broadcast: false},
    queueReqName: 'action_queue',
    queueResName: 'action_res_queue',
    redisUrl: '39.107.61.35',
    redisPort: 6379,
    ok: true,
    no: false
}
const eos = Eos({
    httpEndpoint: 'http://39.107.152.239:8000',
    chainId: '1c6ae7719a2a3b4ecb19584a30ff510ba1b6ded86e1fd8b8fc22f1179c622a32',
    keyProvider: keyProvider,
    expireInSeconds: 60,
    broadcast: false,
    verbose: false
})

function createAccount(account, publicKey, callback) {
    eos.transaction(tr => {
        tr.newaccount({
            creator: 'eosio',
            name: account,
            owner: publicKey,
            active: publicKey
        })

        tr.buyrambytes({
            payer: 'eosio',
            receiver: account,
            bytes: 4096
        })

        tr.delegatebw({
            from: 'eosio',
            receiver: account,
            stake_net_quantity: '0.0002 SYS',
            stake_cpu_quantity: '0.0002 SYS',
            transfer: 0
        })
    }).then(callback)
}

function generateAccounts(nameroot) {
    for (i = 0; i < 31; i++) {
        let accountname = nameroot + nameRule.charAt(i)
        console.log("create account: ", accountname)
        createAccount(accountname, ecc.privateToPublic(keyProvider[1]), asset => {
            console.log(asset)
        })
    }
}

function transferInit(nameroot) {
    for (i = 0; i < 31; i++) {
        let accountname = nameroot + nameRule.charAt(i)
        console.log("transferInit account: ", accountname)
        eos.transfer("eosio", accountname, "40.0000 SYS", "initial distribution", config.optBCST)
    }
}

function getAccountsBalance(nameroot) {
    for (i = 0; i < 31; i++) {
        let accountname = nameroot + nameRule.charAt(i)
        eos.getCurrencyBalance("eosio.token", accountname, "SYS").then(tx => {
            console.log(accountname + " balance: " + tx[0])
        })
    }
}

function createTransferAction(src, dest, quality, memo) {
    return {
        account: "eosio.token",
        name: 'transfer',
        authorization: [{
            actor: src,
            permission: 'active'
        }],
        data: {
            "from": src,
            "to": dest,
            "quantity": quality,
            "memo": memo
        }
    }
}

function createTxLocalByActionPool(callback) {
    let actionpl = actionPool.getPool()
    for (let key in actionpl) {
        let actionArray = actionpl[key]
        actionPool.remove(key)
        eos.transaction({
            actions: actionArray
        }, config.optLocal).then(callback)
    }
}

//生成[0,max]到任意数的随机整数
function randomInt(max) {
    // parseInt(Math.random() * (max + 1), 10);
    return Math.floor(Math.random() * (max + 1));
}

var actionPool = function () {
    var pool = {}
    return {
        add: function (k, v) {
            if (pool.hasOwnProperty(k)) {
                let temp = pool[k]
                if (temp instanceof Array) {
                    temp.push(v)
                    pool[k] = temp
                } else {
                    var actionArray = []
                    actionArray.push(temp)
                    actionArray.push(v)
                    pool[k] = actionArray
                }
            } else {
                var actionArray = []
                actionArray.push(v)
                pool[k] = actionArray
            }
        },
        getV: function (k) {
            return pool[k]
        },
        remove: function (k) {
            delete pool[k];
        },
        getPool: function (k) {
            return pool;
        }
    }
}();

var txPool = function () {
    var pool = []
    return {
        push: function (obj) {
            pool.push(obj)
        },
        getSize: function () {
            return pool.length;
        },
        getPool: function () {
            return pool;
        },
        empty: function () {
            pool = []
        }
    }
}();

function testCreateTransaction() {
    actionPool.add("eosiotesta1", createTransferAction("eosiotesta1", "eosiotesta2", "0.1000 SYS", "11111"))
    actionPool.add("eosiotesta1", createTransferAction("eosiotesta1", "eosiotesta3", "0.1000 SYS", "22222"))
    actionPool.add("eosiotesta1", createTransferAction("eosiotesta1", "eosiotesta3", "0.1000 SYS", "33333"))
    actionPool.add("eosiotesta1", createTransferAction("eosiotesta1", "eosiotesta3", "0.1000 SYS", "44444"))
    actionPool.add("eosiotesta1", createTransferAction("eosiotesta1", "eosiotesta4", "0.1000 SYS", "55555"))
    createTxLocalByActionPool(ret => {
        eos.pushTransaction(ret.transaction).then(ret => {
            let actions = ret.processed.action_traces;
            for (let key in actions) {
                let actionres = actions[key].act.data.memo;
                console.log(actionres)
            }
        })//697483c4d91b43f64c13f3a5d8d1eec921f67fe1fa09387082274eafa831c5ee
    })
}

function getTXContent(transaction_id) {
    eos.getTransaction(transaction_id).then(ret => {
        console.log(ret.trx.trx.actions[0].data)
    })
}

// getTXContent('697483c4d91b43f64c13f3a5d8d1eec921f67fe1fa09387082274eafa831c5ee')
// testCreateTransaction()
// generateAccounts("eosiotesta")
// generateAccounts("eosiotestb")
// transferInit("eosiotesta")
// transferInit("eosiotestb")
// getAccountsBalance("eosiotesta")
// getAccountsBalance("eosiotestb")

// testPushPoolTX("eosiotesta", "eosiotestb")
// console.log(ecc.privateToPublic('5JxWkyTDwktJVs9MNgNgmaLrRc26ESswR9gk926g47t6UCqvmop'))
// testPushTX("eosiotesta", "eosiotestb")
// console.log(eos.fc.structs.action)
/**
 * 计算push_transaction 和push_transactions 两种方式的耗时对比，即性能对比。
 */
function testPushPoolTX(srcAccount, destAccount) {
    var start = new Date().getTime()
    console.log("start time: " + start)
    // ---------------------------- pack actions ----------------------------
    for (let i = 0; i < 10; i++) {
        let com = nameRule.charAt(randomInt(30));
        let src = "eosiotesta1";
        let dest = destAccount + com;
        let quality = "0.0001 SYS";
        let memo = i;
        actionPool.add(src, createTransferAction(src, dest, quality, memo));
    }

    // ---------------------------- post transaction ----------------------------
    createTxLocalByActionPool(tx => {
            if (true) {
                txPool.push(tx.transaction);
                if (txPool.getSize() == config.trx_pool_size) {
                    var signTxs = txPool.getPool();
                    txPool.empty();
                    eos.pushTransactions(signTxs).then(ret => {
                        console.log("Push Pool Transactions spend time: " + (new Date().getTime() - start) + " ms");
                        console.log(ret)
                    })//50 actions: 3670 ms 3586 ms 4062 ms 4747 ms 3051 ms, average: 3823.2 ms
                }
            } else {
                eos.pushTransaction(tx.transaction).then(ret => {
                    console.log("Push Pool Transaction spend time: " + (new Date().getTime() - start) + " ms")
                })//50 actions: 5683 ms 5357 ms 5774 ms 4624 ms 6361 ms, average: 5559.8 ms
            }
        }
    )
}

// console.log((3670 + 3586 + 4062 + 4747 + 3051) / 5)
// console.log((5683 + 5357 + 5774 + 4624 + 6361) / 5)
// console.log((8427 + 9987 + 12156 + 13120 + 16339) / 5)

function testPushTX(srcAccount, destAccount) {
    var start = new Date().getTime()
    console.log("start time: " + start)
    // ---------------------------- pack actions ----------------------------
    for (let i = 0; i < 1; i++) {
        let com = nameRule.charAt(randomInt(30))
        let src = srcAccount + com
        let dest = destAccount + com
        let quality = "0.0001 SYS"
        let memo = "packing test"
        eos.transfer(src, dest, quality, memo).then(ret => {
            console.log("Push Transactions spend time: " + (new Date().getTime() - start) + " ms")
        })//50 actions: 8427 ms 9987 ms 12156 ms 13120 ms 16339 ms, average: 12005.8 ms
    }
}

// const queueName = 'action_queue'
// const redisPort = 6379
// const redisUrl = '39.107.61.35'
// var raq = require("redis-as-queue");
// var uniqueQueue = new raq.UniqueQueue(queueName, redisPort, redisUrl, {});
// var req_test = '"id":2121,' +
//     '"to":"lwb"' +
//     '"quality":300' +
//     '"memo":"test for now"'
// console.log(req_test)
// uniqueQueue.get(10, function (err, messages) {
//     if (err != null) console.log(err);
//     for (var i = 0; i < messages.length; i++) console.log(messages[i]);
// });

// eos.abiBinToJson("eosio.token","transfer","0082c95865ea30550086c95865ea3055e8030000000000000453595300000000053333333333").then(ret=>{
//     console.log(ret.args.memo)
// })
const resQueue = new raq.UniqueQueue(config.queueResName, config.redisPort, config.redisUrl, {});

function getResQueue() {
    resQueue.get(-1, function (err, messages) {
        if (err != null) console.log(err);
        if (messages.length) {
            for (let key in messages) {
                let msg = messages[key]
                console.log("consume：" + msg.message + "  " + msg.updatedAt)
            }
        }
    });
}
// getResQueue()