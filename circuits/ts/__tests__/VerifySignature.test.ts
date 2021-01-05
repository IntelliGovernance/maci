jest.setTimeout(90000)
import {
    stringifyBigInts,
    verifySignature,
    hash4,
} from 'maci-crypto'

import {
    Keypair,
    Command,
} from 'maci-domainobjs'

import { 
    genWitness,
    getSignalByName,
} from './utils'

const circuit = 'verifySignature_test'

describe('Signature verification circuit', () => {

    it('verifies a valid signature', async () => {

        const keypair = new Keypair()
        const command = new Command(
            BigInt(0),
            keypair.pubKey,
            BigInt(123),
            BigInt(123),
            BigInt(1),
            BigInt(2),
            BigInt(3),
        )

        const signer = new Keypair()
        const sig = command.sign(signer.privKey)
        const plaintext = hash4(command.asArray())

        expect(verifySignature(plaintext, sig, signer.pubKey.rawPubKey)).toBeTruthy()

        const circuitInputs = stringifyBigInts({
            pubKey: signer.pubKey.asCircuitInputs(),
            'R8x': stringifyBigInts(sig.R8[0]),
            'R8y': stringifyBigInts(sig.R8[1]),
            'S': stringifyBigInts(sig.S),
            'preimage': stringifyBigInts(command.asArray())
        })

        const witness = await genWitness(circuit, circuitInputs)
        const isValid = await getSignalByName(circuit, witness, 'main.valid')
        expect(isValid).toEqual('1')
    })

    it('rejects an invalid signature', async () => {
        const keypair = new Keypair()
        const command = new Command(
            BigInt(0),
            keypair.pubKey,
            BigInt(123),
            BigInt(123),
            BigInt(1),
            BigInt(2),
            BigInt(3),
        )

        const signer = new Keypair()
        const wrongSigner = new Keypair()

        expect(signer.privKey.rawPrivKey).not.toEqual(wrongSigner.privKey.rawPrivKey)

        const sig = command.sign(signer.privKey)

        const plaintext = hash4(command.asArray())

        // The signature is signed by `signer`
        expect(verifySignature(plaintext, sig, signer.pubKey.rawPubKey)).toBeTruthy()

        // The signature is not signed by `wrongSigner`
        expect(verifySignature(plaintext, sig, wrongSigner.pubKey.rawPubKey)).toBeFalsy()

        const circuitInputs = stringifyBigInts({
            pubKey: wrongSigner.pubKey.asCircuitInputs(),
            'R8x': sig.R8[0],
            'R8y': sig.R8[1],
            'S': sig.S,
            'preimage': command.asArray()
        })

        const witness = await genWitness(circuit, circuitInputs)
        const isValid = await getSignalByName(circuit, witness, 'main.valid')
        expect(isValid).toEqual('0')
    })
})
