const { spawnCluster } = require('./cluster.js')
const { createClient } = require('./client.js')

let client, cluster;


describe('pkg-aware balancer', () => {

  beforeAll(async () => {
    cluster = await spawnCluster({
      balancer: 'pkg-aware',
      port: 9020,
      workers: [9021, 9022]
    })    
    client = createClient(9020)
  })

  afterAll(() => {
    cluster.kill();
  })

  it('should reuse the same worker node if the package lists are the same', async () => {
    const requests = new Array(3).fill({ pkgs: ['pkg0', 'pkg1'] })
    const responses = await client.sendRequestsSequentially(requests)
    const responseTexts = responses.map(res => res.text)

    expect(responseTexts).toEqual([
      "Request handled by worker at 9022",
      "Request handled by worker at 9022",
      "Request handled by worker at 9022"
    ]);
  });

  it('if the hashes of the packages lists are different, the requests should go to different nodes', async () => {
    // assume these 2 lists compute different hashes on olscheduler
    const requestFor1stNode = { pkgs: ['pkg0', 'pkg1'] }
    const requestFor2stNode = { pkgs: ['pkg7', 'pkg8'] }
    const requests = [
      requestFor1stNode, 
      requestFor1stNode, 
      requestFor2stNode, 
      requestFor1stNode, 
      requestFor2stNode]

    const responses = await client.sendRequestsSequentially(requests)
    const responseTexts = responses.map(res => res.text)

    expect(responseTexts).toEqual([
      "Request handled by worker at 9022",
      "Request handled by worker at 9022",
      "Request handled by worker at 9021",
      "Request handled by worker at 9022",
      "Request handled by worker at 9021"
    ]);
  });
});
