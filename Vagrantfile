# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|

    config.vm.box = "scotch/box"
    config.vm.box_version = "3.5.0"
    config.vm.network "private_network", ip: "192.168.33.54"
    config.vm.hostname = "x16.tmp2k.com.vm"
    config.vm.synced_folder ".", "/var/www", :mount_options => ["dmode=777", "fmode=666"]
    config.vm.provision "shell",
        inline: "npm install -g gulp-cli"
   
end
