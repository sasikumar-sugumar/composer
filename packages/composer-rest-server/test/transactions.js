/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const AdminConnection = require('composer-admin').AdminConnection;
const BrowserFS = require('browserfs/dist/node/index');
const BusinessNetworkConnection = require('composer-client').BusinessNetworkConnection;
const BusinessNetworkDefinition = require('composer-common').BusinessNetworkDefinition;
const fs = require('fs');
require('loopback-component-passport');
const path = require('path');
const server = require('../server/server');

const chai = require('chai');
chai.should();
chai.use(require('chai-http'));

const bfs_fs = BrowserFS.BFSRequire('fs');

['always', 'never'].forEach((namespaces) => {

    const prefix = namespaces === 'always' ? 'org.acme.bond.' : '';

    describe(`Transaction REST API unit tests namespaces[${namespaces}]`, () => {

        const assetData = [{
            $class: 'org.acme.bond.BondAsset',
            ISINCode: 'ISIN_1',
            bond: {
                $class: 'org.acme.bond.Bond',
                dayCountFraction: 'EOM',
                exchangeId: [
                    'NYSE'
                ],
                faceAmount: 1000,
                instrumentId: [
                    'AliceCorp'
                ],
                issuer: 'resource:org.acme.bond.Issuer#1',
                maturity: '2018-02-27T21:03:52.000Z',
                parValue: 1000,
                paymentFrequency: {
                    $class: 'org.acme.bond.PaymentFrequency',
                    period: 'MONTH',
                    periodMultiplier: 6
                }
            }
        }, {
            $class: 'org.acme.bond.BondAsset',
            ISINCode: 'ISIN_2',
            bond: {
                $class: 'org.acme.bond.Bond',
                dayCountFraction: 'EOM',
                exchangeId: [
                    'NYSE'
                ],
                faceAmount: 1000,
                instrumentId: [
                    'BobCorp'
                ],
                issuer: 'resource:org.acme.bond.Issuer#1',
                maturity: '2018-02-27T21:03:52.000Z',
                parValue: 1000,
                paymentFrequency: {
                    $class: 'org.acme.bond.PaymentFrequency',
                    period: 'MONTH',
                    periodMultiplier: 6
                }
            }
        }, {
            $class: 'org.acme.bond.BondAsset',
            ISINCode: 'ISIN_3',
            bond: {
                $class: 'org.acme.bond.Bond',
                dayCountFraction: 'EOM',
                exchangeId: [
                    'NYSE'
                ],
                faceAmount: 1000,
                instrumentId: [
                    'CharlieCorp'
                ],
                issuer: 'resource:org.acme.bond.Issuer#1',
                maturity: '2018-02-27T21:03:52.000Z',
                parValue: 1000,
                paymentFrequency: {
                    $class: 'org.acme.bond.PaymentFrequency',
                    period: 'MONTH',
                    periodMultiplier: 6
                }
            }
        }, {
            // $class: 'org.acme.bond.BondAsset',
            ISINCode: 'ISIN_4',
            bond: {
                $class: 'org.acme.bond.Bond',
                dayCountFraction: 'EOM',
                exchangeId: [
                    'NYSE'
                ],
                faceAmount: 1000,
                instrumentId: [
                    'DogeCorp'
                ],
                issuer: 'resource:org.acme.bond.Issuer#1',
                maturity: '2018-02-27T21:03:52.000Z',
                parValue: 1000,
                paymentFrequency: {
                    $class: 'org.acme.bond.PaymentFrequency',
                    period: 'MONTH',
                    periodMultiplier: 6
                }
            }
        }];

        const participantData = [{
            $class: 'org.acme.bond.Issuer',
            memberId: 'MEMBER_1',
            name: 'Alice'
        }];

        let app;
        let businessNetworkConnection;
        let assetRegistry;
        let participantRegistry;
        let serializer;

        before(() => {
            BrowserFS.initialize(new BrowserFS.FileSystem.InMemory());
            const adminConnection = new AdminConnection({ fs: bfs_fs });
            return adminConnection.createProfile('defaultProfile', {
                type : 'embedded'
            })
            .then(() => {
                return adminConnection.connect('defaultProfile', 'admin', 'Xurw3yU9zI0l');
            })
            .then(() => {
                const banana = fs.readFileSync(path.resolve(__dirname, 'bond-network.bna'));
                return BusinessNetworkDefinition.fromArchive(banana);
            })
            .then((businessNetworkDefinition) => {
                serializer = businessNetworkDefinition.getSerializer();
                return adminConnection.deploy(businessNetworkDefinition);
            })
            .then(() => {
                return server({
                    connectionProfileName: 'defaultProfile',
                    businessNetworkIdentifier: 'bond-network',
                    participantId: 'admin',
                    participantPwd: 'adminpw',
                    fs: bfs_fs,
                    namespaces: namespaces
                });
            })
            .then((app_) => {
                app = app_;
                businessNetworkConnection = new BusinessNetworkConnection({ fs: bfs_fs });
                return businessNetworkConnection.connect('defaultProfile', 'bond-network', 'admin', 'Xurw3yU9zI0l');
            })
            .then(() => {
                return businessNetworkConnection.getAssetRegistry('org.acme.bond.BondAsset');
            })
            .then((assetRegistry_) => {
                assetRegistry = assetRegistry_;
            })
            .then(() => {
                return businessNetworkConnection.getParticipantRegistry('org.acme.bond.Issuer');
            })
            .then((participantRegistry_) => {
                participantRegistry = participantRegistry_;
                return participantRegistry.addAll([
                    serializer.fromJSON(participantData[0])
                ]);
            });
        });

        describe(`POST / namespaces[${namespaces}]`, () => {

            it('should submit the specified transaction without a client supplied transaction ID or timestamp', () => {
                return chai.request(app)
                    .post(`/api/${prefix}PublishBond`)
                    .send({
                        $class: 'org.acme.bond.PublishBond',
                        ISINCode: assetData[0].ISINCode,
                        bond: assetData[0].bond
                    })
                    .then((res) => {
                        res.should.have.status(200);
                        return assetRegistry.get('ISIN_1');
                    })
                    .then((asset) => {
                        let json = serializer.toJSON(asset);
                        json.should.deep.equal(assetData[0]);
                        return assetRegistry.remove('ISIN_1');
                    });
            });

            it('should return a 422 if the specified transaction has a client supplied transaction ID', () => {
                return chai.request(app)
                    .post(`/api/${prefix}PublishBond`)
                    .send({
                        $class: 'org.acme.bond.PublishBond',
                        transactionId: '00000000-0000-0000-0000-000000000000',
                        ISINCode: assetData[0].ISINCode,
                        bond: assetData[0].bond
                    })
                    .catch((err) => {
                        err.response.should.have.status(422);
                    });
            });

            it('should submit the specified transaction without a $class property', () => {
                return chai.request(app)
                    .post(`/api/${prefix}PublishBond`)
                    .send({
                        ISINCode: assetData[1].ISINCode,
                        bond: assetData[1].bond
                    })
                    .then((res) => {
                        res.should.have.status(200);
                        return assetRegistry.get('ISIN_2');
                    })
                    .then((asset) => {
                        let json = serializer.toJSON(asset);
                        json.should.deep.equal(assetData[1]);
                        return assetRegistry.remove('ISIN_2');
                    });
            });

            it('should submit the specified transaction with a client supplied timestamp', () => {
                return chai.request(app)
                    .post(`/api/${prefix}PublishBond`)
                    .send({
                        $class: 'org.acme.bond.PublishBond',
                        ISINCode: assetData[2].ISINCode,
                        bond: assetData[2].bond,
                        timestamp: new Date()
                    })
                    .then((res) => {
                        res.should.have.status(200);
                        return assetRegistry.get('ISIN_3');
                    })
                    .then((asset) => {
                        let json = serializer.toJSON(asset);
                        json.should.deep.equal(assetData[2]);
                    });
            });

            it('should submit the specified array of transactions', () => {
                return chai.request(app)
                    .post(`/api/${prefix}PublishBond`)
                    .send([{
                        ISINCode: assetData[0].ISINCode,
                        bond: assetData[0].bond
                    }, {
                        ISINCode: assetData[1].ISINCode,
                        bond: assetData[1].bond
                    }])
                    .then((res) => {
                        res.should.have.status(200);
                        return assetRegistry.get('ISIN_1');
                    })
                    .then((asset) => {
                        let json = serializer.toJSON(asset);
                        json.should.deep.equal(assetData[0]);
                        return assetRegistry.remove('ISIN_1');
                    })
                    .then((res) => {
                        return assetRegistry.get('ISIN_2');
                    })
                    .then((asset) => {
                        let json = serializer.toJSON(asset);
                        json.should.deep.equal(assetData[1]);
                        return assetRegistry.remove('ISIN_2');
                    });
            });

        });

    });

});
