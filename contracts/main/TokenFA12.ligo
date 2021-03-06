#include "../partial/TokenFA12Methods.ligo"

function main (const a : action; var s : storage) : (list(operation) * storage) is
case a of
| Transfer(v) -> ((nil : list(operation)), transfer( v.0, v.1.0, v.1.1, s))
| Approve(v) -> ((nil : list(operation)), approve(v.0, v.1, s))
| Mint(v) -> ((nil : list(operation)), mint(s))
| Default(v) -> ((nil : list(operation)), mint(s))
| Redeem(v) -> redeem(v, s)
| Stake(v) -> ((nil : list(operation)), (stake(v, s)))
| Unstake(v) -> ((nil : list(operation)), (unstake(v, s)))
| GetBalance(v) -> (getBalance(v.0, v.1, s), s)
| GetAllowance(v) -> (getAllowance(v.0.0, v.0.1, v.1, s), s)
| GetTotalSupply(v) -> (getTotalSupply(v.1, s), s)
end
